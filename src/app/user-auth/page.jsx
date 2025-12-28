"use client"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github } from "lucide-react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Loader from "../components/Loader";
import { useRouter } from "next/navigation";

const page = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const url = process.env.NEXTAUTH_URL;

  useEffect(() => {
    localStorage.removeItem('hasShownWelcome')
  }, [])

  const handleLogin = async (provider) => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl: url })
      toast.info(`logging with ${provider} `)
    } catch (error) {
      toast.error(`failed to login with ${provider}, please try again`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (isLogin) {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res.error) {
        toast.error("Invalid Credentials");
        setIsLoading(false);
        return;
      }

      router.push("/");
    } else {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        });

        if (res.ok) {
          toast.success("Registration Successful! Please login.");
          setIsLogin(true);
        } else {
          const errorData = await res.json();
          toast.error(errorData.message || "Registration Failed");
        }
      } catch (error) {
        toast.error("Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-blue-100 to-purple-200 dark:from-gray-900 dark:to-gray-800">
      {isLoading && <Loader />}
      <div className="hidden w-1/2 bg-gray-100 lg:block">
        <Image
          src="/images/meet_image.jpg"
          width={1080}
          height={1080}
          alt="login_image"
          className="object-cover w-full h-full"
        />
      </div>
      <div className="flex flex-col justify-center w-full p-8 lg:w-1/2">
        <div className="max-w-md mx-auto w-full">
          <h1 className="mb-4 text-4xl font-bold">{isLogin ? "Welcome Back" : "Create Account"}</h1>
          <p className="mb-8 text-gray-600 dark:textgray-100">
            {isLogin ? "Connect with your team anytime, anywhere." : "Join us for crystal-clear HD video and audio meetings."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {!isLogin && (
              <Input
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
              />
            )}
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" type="submit">
              {isLogin ? "Login" : "Sign Up"}
            </Button>
          </form>

          <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-4">
            {isLogin ? "Don't have an account?" : "Already have an account?"} {" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-blue-500 hover:underline dark:text-blue-400 font-medium">
              {isLogin ? "Create now" : "Login here"}
            </button>
          </p>
        </div>
      </div>
    </div>

  );
};

export default page;
