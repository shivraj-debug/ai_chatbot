import { Request, Response, NextFunction } from "express";
import Chat from "../models/chat";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// History Handler (Placeholder)
interface IRequestQuery {
  userId?: string;
  sessionId?: string;
  days?: string;
}

export const chatHistory = async (
  req: Request<{}, {}, {}, IRequestQuery>,
  res: Response
): Promise<void> => {
  const { sessionId, days } = req.query;
  const userId = (req.user as { id: string })?.id;

  try {
    // Validate required parameters
    if (!userId || !sessionId) {
      res.status(400).json({
        success: false,
        error: "Both userId and sessionId are required query parameters",
      });
      return;
    }

    // Build the query object
    const query: {
      userId: string;
      sessionId: string;
      isDeleted: boolean;
      createdAt?: { $gte: Date };
    } = {
      userId,
      sessionId,
      isDeleted: false,
    };

    // Add date filter if days parameter is provided
    if (days && !isNaN(Number(days))) {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - Number(days));
      query.createdAt = { $gte: fromDate };
    }

    // Fetch messages sorted by creation time (oldest first)
    const history = await Chat.find(query)
      .sort({ createdAt: 1 }) // 1 for ascending (oldest first), -1 for descending
      .select("-__v -isDeleted") // Exclude these fields from the response
      .lean(); // Return plain JavaScript objects

    // Format the response
    const response = {
      success: true,
      count: history.length,
      sessionId,
      userId,
      messages: history.map((message) => ({
        id: message._id,
        sender: message.sender,
        content: message.content,
        timestamp: message.createdAt,
      })),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching chat history",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const chat = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as { id: string })?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized - User not authenticated" });
      return;
    }

    // Validate message content
    const { content, sessionId } = req.body;

    if (!content || typeof content !== "string" || !content.trim()) {
      res
        .status(400)
        .json({ error: "Message content is required and must be non-empty" });
      return;
    }

    const userMessage = new Chat({
      userId,
      sessionId,
      sender: "user",
      content: content.trim(),
      isDeleted: false,
    });
    await userMessage.save();

    // Load recent messages for context (optional: limit to last 5-10)
    const previousMessages = await Chat.find({
      sessionId: sessionId,
      isDeleted: false,
    })
      .sort({ createdAt: 1 })
      .limit(10);

    // Convert to Gemini format: { role: 'user' | 'model', parts: [{ text }] }
    const geminiHistory = previousMessages.map((msg) => ({
      role: msg.sender === "ai" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // 2. Initialize the Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 600,
        topP: 0.9,
        topK: 40,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
      ],
    });

    if (!model) {
      res.status(500).json({ error: "Failed to initialize Gemini model." });
      return;
    }

    // 3. Start a new chat session with system instruction
    const chat = model.startChat({
      history: geminiHistory,
      generationConfig: { temperature: 0.8 },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
      systemInstruction: {
        role: "system",
        parts: [
          {
            text: `
    You are a helpful, friendly AI assistant 🤖.
    Respond clearly, using simple language and real-life examples when needed.
    Keep responses concise, but don't skip important details.
    Feel free to use bullet points, code blocks, or emojis if it improves understanding.
          `.trim(),
          },
        ],
      },
    });

    // 4. Send user message to Gemini0
    const result = await chat.sendMessageStream(content.trim())

    let responseText = "";

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      responseText += chunkText;
      res.write(chunkText);
    }

    res.end();
    // 5. Save the AI response
    const aiMessage = new Chat({
      userId,
      sessionId,
      sender: "ai",
      content: responseText,
      isDeleted: false,
    });
    await aiMessage.save();
  

    // 7. Return response
    // res.status(201).json({
    //   success: true,
    // sessionId,
    // aiResponse: responseText,
    // userMessageId: userMessage._id,
    // aiMessageId: aiMessage._id,
    // timestamp: new Date(),
    // });
  } catch (error) {
    console.error("Chat error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to process chat message",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const conversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as { id: string })?.id;

    if (!userId) {
      res.status(400).json({ error: "Both userId and sessionId are required" });
      return;
    }

    let currConversation = await Chat.findOne({ userId }).sort({
      createdAt: -1,
    });

    if (!currConversation) {
      currConversation = await Chat.create({
        userId,
        sessionId: crypto.randomUUID(),
        title: "New Chat",
      });
    }

    // Get all conversations for sidebar
    const conversations = await Chat.aggregate([
      { $match: { userId: Object } },
      {
        $group: {
          _id: "$sessionId",
          rootDoc: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$rootDoc" } },
      {
        $project: {
          _id: 0,
          sessionId: 1,
          id: "$_id",
          content: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    res.json({
      currentConversation: currConversation,
      conversations,
    });
  } catch (error) {
    console.error("Conversation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch conversation messages",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteconversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { sessionId } = req.query;
    const userId = (req.user as { id: string })?.id;

    if (!userId || !sessionId) {
      res.status(400).json({ error: "Both userId and sessionId are required" });
      return;
    }

    // Delete the conversation
    const result = await Chat.deleteMany({ userId, sessionId });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: "No conversations found to delete" });
      return;
    }

    res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete conversation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateconversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { sessionId, newTitle } = req.body;
    const userId = (req.user as { id: string })?.id;

    if (!userId || !sessionId || !newTitle) {
      res.status(400).json({ error: "Both userId and sessionId are required" });
      return;
    }

    // Update the conversation title
    const result = await Chat.findOneAndUpdate(
      { userId, sessionId },
      { newTitle: newTitle },
      { new: true }
    );

    if (!result) {
      res.status(404).json({ error: "No conversations found to update" });
      return;
    }

    res
      .status(200)
      .json({
        message: "Conversation updated successfully",
        conversation: result,
      });
  } catch (error) {
    console.error("Update conversation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update conversation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const chatSummary = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const conversations = await Chat.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $group: {
          _id: "$sessionId",
          user: { $first: "$user.name" },
          messages: { $sum: 1 },
          firstMessageTime: { $min: "$createdAt" },
          lastMessageTime: { $max: "$createdAt" },
        },
      },
      {
        $addFields: {
          duration: {
            $toInt: {
              $divide: [
                { $subtract: ["$lastMessageTime", "$firstMessageTime"] },
                60000, // Convert ms to minutes
              ],
            },
          },
          date: {
            $dateToString: { format: "%Y-%m-%d", date: "$lastMessageTime" },
          },
        },
      },
      {
        $project: {
          _id: 0,
          sessionId: "$_id",
          user: 1,
          messages: 1,
          duration: 1,
          date: 1,
        },
      },
    ]);
    conversations.forEach((conversation) => {
      conversation.satisfaction = "neutral";
    });
    conversations[0].satisfaction = "positive";
    conversations[1].satisfaction = "negative";

    res.json(conversations);
  } catch (error) {
    console.error("Chat Summary error:", error);
    res.status(500).json({
      error: "Failed to fetch chat summary",
    });
  }
};

export const topqueries = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("top queries");
    const topQueries = await Chat.aggregate([
      {
        $group: {
          _id: "$content", // Group by query (message content)
          count: { $sum: 1 }, // Count occurrences of each query
        },
      },
      {
        $sort: { count: -1 }, // Sort by highest count
      },
      {
        $limit: 5, // Get top 5 queries
      },
      {
        $project: {
          _id: 0,
          query: "$_id",
          count: 1,
        },
      },
    ]);
    console.log("topQueries", topQueries);
    res.json(topQueries);
  } catch (error) {
    console.error("Top Queries error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch top queries",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
