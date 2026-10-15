import React from "react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { HeartIcon } from "lucide-react";

const LoginLeft = () => {
  return (
    <div className="flex lg:w-2/5 bg-[url('/bg-img.png')] bg-cover bg-center bg-no-repeat flex-col justify-between p-12 shrink-0 select-none">
      <div className="flex items-center gap-3">
        <img src="/logo.svg" alt="Logo" className="size-9.5" />
        <span className="text-4xl font-medium text-white">SiteGen</span>
      </div>
      <div>
        <h2 className="text-3xl text-white font-medium leading-snug mb-3 tracking-tight">
          Build your presence on web
        </h2>
        <p className="text-zinc-300">
          Describe what you need, preview instantly, and customize your site in
          real-time.
        </p>
        <p className="text-zinc-300 text-sm mt-20">
          Copyright {new Date().getFullYear()} SiteGen. All rights reserved.
        </p>

        {/* BUILT BY */}
        <div className="flex items-center gap-2 text-zinc-300 text-sm ">
          <span className="flex items-center gap-1">
            Built with <HeartIcon size={13} /> by Harsh Sharma
          </span>

          <a
            href="https://github.com/harsh0190"
            target="_blank"
            rel="noreferrer"
            className="cursor-pointer hover:text-black transition"
          >
            <FaGithub size={15} />
          </a>

          <a
            href="https://linkedin.com/in/harsh-sharma0190"
            target="_blank"
            rel="noreferrer"
            className="cursor-pointer hover:text-blue-400 transition"
          >
            <FaLinkedin size={15} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginLeft;
