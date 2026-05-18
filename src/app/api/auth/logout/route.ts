import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ message: "Logged out" });
    response.cookies.delete("auth-token");
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return errorResponse("Internal server error", 500);
  }
}
