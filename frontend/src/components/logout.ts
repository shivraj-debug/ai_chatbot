"use client"

export const logout=async ()=>{
    try{
      const response = await fetch("http://localhost:4000/api/user/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
    }catch(err){
      throw new Error("error during logout")
    }
}

