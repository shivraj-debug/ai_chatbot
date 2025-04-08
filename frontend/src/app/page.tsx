"use client"

import { Button } from "@/components/ui/button"
import { signIn } from "next-auth/react"
import {  MessageSquare } from "lucide-react"
import Link from "next/link"
import {hasCookie} from "cookies-next"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function WelcomeScreen() {
  const router = useRouter()
  const userIsLoggedIn = hasCookie("token")

  useEffect(() => {
    if (userIsLoggedIn) {
      router.push('/dashboard');
    }
  }, [userIsLoggedIn]);


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4 text-center">
      <div className="mb-8 rounded-full bg-primary/10 p-4">
        <MessageSquare className="h-12 w-12 text-primary" />
      </div>

      <h1 className="mb-2 text-4xl font-bold">Welcome to AI Chatbot</h1>

      <p className="mb-8 max-w-md text-muted-foreground">
        Your personal AI assistant powered by advanced language models. Sign in to start chatting and get intelligent
        responses.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/login"
          className="cursor-pointer"
        >
         <Button variant="outline">Sign In</Button>
        </Link>

        <Link
          href="/signup"
          className="cursor-pointer"
        >
         <Button variant="outline">Sign up</Button>
        </Link>

        <Link
          href="admin/login"
          className="cursor-pointer"
        >
         <Button variant="outline">Sign In as Admin</Button>
        </Link>
      </div>
    </div>
  )
}

