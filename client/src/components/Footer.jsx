import { FaGithub, FaLinkedin } from "react-icons/fa";

import { Globe, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="

border-t


bg-slate-950

px-8

py-5

flex

items-center

justify-between

text-sm

text-slate-300

"
    >
      {/* COPYRIGHT */}

      <div>SiteGen © 2026</div>

      {/* BUILT BY */}

      <div
        className="

flex

items-center

gap-2

"
      >
        Built with
        <Heart
          size={16}
          className="

text-red-500

"
        />
        by
        <span
          className="

font-semibold

text-white

"
        >
          Harsh Sharma
        </span>
      </div>

      {/* LINKS */}

      <div
        className="

flex

items-center

gap-5

"
      >
        <a
          href="https://github.com/harsh0190"
          target="_blank"
          rel="noreferrer"
          className="

text-xl

cursor-pointer

hover:text-white

transition

"
        >
          <FaGithub />
        </a>

        <a
          href="https://linkedin.com/in/harsh-sharma0190"
          target="_blank"
          rel="noreferrer"
          className="

text-xl

cursor-pointer

hover:text-blue-400

transition

"
        >
          <FaLinkedin />
        </a>

        <a
          href="https://buildwithharsh.vercel.app/"
          target="_blank"
          rel="noreferrer"
          className="

cursor-pointer

hover:text-indigo-400

transition

"
        >
          <Globe size={21} />
        </a>
      </div>
    </footer>
  );
}
