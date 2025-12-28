import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { message: "All fields are required" },
                { status: 400 }
            );
        }

        await dbConnect();

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { message: "User already exists" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        await User.create({
            name,
            email,
            password: hashedPassword,
            isVerified: false,
        });

        return NextResponse.json({ message: "User registered successfully" }, { status: 201 });
    } catch (error) {
        console.error("Register Error:", error);
        return NextResponse.json(
            { message: "An error occurred: " + error.message },
            { status: 500 }
        );
    }
}
