import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoginLeft from "../components/LoginLeft";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react"
import { useAppContext } from "../context/AppContext";

const AuthPage = ({ mode }) => {

  const { login, register } = useAppContext();
  const navigate = useNavigate();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showpassword, setShowPassword] = useState(false);

  const islogin = mode === "login";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate("/")
    } catch (err) {
      setError(err.response.data.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex text-zinc-900 font-sans">
      {/* {Left Panel - Branding} */}
      <LoginLeft />
      {/* {Right Panel - Form} */}
      <div className="flex-1 flex justify-center items-center">
        <div className="w-full max-w-sm ">
          <div className="mb-10">
            <h1 className="text-3xl font-medium tracking-tight text-zinc-900 mb-1.5 font-sans">
              {islogin ? "Sign-in" : "Create an account"}
            </h1>
            <p className="text-sm text-zinc-400">
              {islogin
                ? "Enter your credentials to sign in"
                : "Get started by creating a new account"}
            </p>
          </div>
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            { !islogin && (
              <div>
                <label
                  className="block text-sm font-medium text-zinc-700"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 block w-full border border-zinc-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
            <div>
                <label
                  className="block text-sm font-medium text-zinc-700"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                    className="mt-1 block w-full border border-zinc-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-zinc-700"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                  type={showpassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                    className="mt-1 block w-full border border-zinc-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showpassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 cursor-pointer"
                  >
                    {showpassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                
              </div>

              <button
                type="submit"
                disabled={loading}
              
                className="w-full py-2.5 bg-linear-to-br from-red-600 to-amber-600 text-white rounded-md shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 flex justify-center items-center transition-all cursor-pointer"
              >
                {loading && <Loader2Icon className="animate-spin" />}
                {islogin ? "Sign in" : "Sign up"}
              </button>

          </form>

          <p className=" text-zinc-500 mt-4">
            {islogin ? (
              <>
                New to SiteGen?{" "}
                <Link
                  to="/register"
                  className="text-zinc-900 font medium hover:underline"
                >
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-zinc-900 font medium hover:underline"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
