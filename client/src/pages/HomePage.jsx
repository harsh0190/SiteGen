import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import PromptInput from "../components/PromptInput";
import { useNavigate } from "react-router-dom";
import { SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/api";
import { homeTags } from "../assets/assets";

const HomePage = () => {
  const navigate = useNavigate();
  const {
    user,
    projects,
    loadingProjects,
    generatingProject,
    loadProjects,
    handleGenerate,
    handleDelete,
    logout,
  } = useAppContext();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Semantic search: results === null means "not searching, show all projects"
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // Runs on submit (not on every keystroke) so each search is one embedding call
  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    try {
      const { data } = await api.get("/api/projects/search", {
        params: { q },
      });
      setResults(data);
    } catch (error) {
      toast.error(error.response?.data?.error || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults(null);
  };

  const visibleProjects = results ?? projects;

  return (
    <div className="h-screen overflow-y-scroll text-white font-sans bg-[url('/bg-img.png')] bg-cover bg-center bg-no-repeat ">
      {/* Nav */}
      <nav className="stick top-0 z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" className="size-6" />
          <span className="text-xl font-semibold tracking-tight">SiteGen</span>
        </div>
        <div className=" flex items-center gap-4 text-sm font-medium text-zinc-300">
          <span>{user?.name}</span>
          <button
            onClick={logout}
            className="py-1.5 px-3 border border-white/20 text-white hover:bg-white/10 test-xs rounded-md cursor-pointer bg-transparent"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 mt-8 xl:mt-28">
        <div className="w-full max-w-2xl flex flex-col items-center">
          {/* Title */}
          <h1 className="text-center text-4xl md:text-6xl font-medium mt-4 max-w-2xl text-white">
            Let's build your app together!
          </h1>
          <p className="text-center text-sm md:text-base mt-4 max-w-xl text-white/65 leading-relaxed">
            Describe your idea and watch AI design, structure & launch your
            website instantly!
          </p>
          {/* Prompt input */}
          <div className="w-full mt-6">
            <PromptInput
              onSubmit={handleGenerate}
              loading={generatingProject}
              placeholder="Create a portfolio website..."
              variant="glass"
              autoFocus
            />
          </div>

          {/* Scrolling marqee tags */}
          <div className="masked-marquee w-full mt-4 max-w-2xl overflow-hidden py-1">
            <div className="animate-marquee gap-3">
              {homeTags.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => handleGenerate(tag)}
                  disabled={generatingProject}
                  className="px-4 py-1.5 border rounded-full text-sm text-white bg-white/10 border-white/25 hover:bg-white/20 transition cursor-pointer shrink-0 font-medium"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* All Projects */}
          {!loadingProjects && projects.length > 0 && (
            <div className="mt-12 w-full">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/30">
                <p className="text-xs font-medium uppercase text-zinc-100 tracking-widest">
                  All Projects
                </p>
                <span className="text-xs font-normal text-zinc-100">
                  {projects.length}{" "}
                  {projects.length === 1 ? "Project" : "Projects"}
                </span>
              </div>

              {/* Semantic search */}
              <form
                onSubmit={handleSearch}
                className="flex items-center gap-2 mb-3"
              >
                <div className="relative flex-1">
                  <SearchIcon
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    maxLength={300}
                    placeholder="Search by meaning, e.g. online store"
                    className="w-full bg-white/5 border border-white/20 rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching || !query.trim()}
                  className="py-2 px-3 text-sm border border-white/20 text-white hover:bg-black/50 rounded-md cursor-pointer bg-black/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {searching ? "Searching..." : "Search"}
                </button>
                {results !== null && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Clear search"
                    className="p-2 border border-white/20 text-zinc-200 hover:bg-white/10 rounded-md cursor-pointer bg-transparent"
                  >
                    <XIcon size={14} />
                  </button>
                )}
              </form>

              {results !== null && results.length === 0 && (
                <p className="text-sm text-white/65 py-3">
                  No similar projects found. Try different words.
                </p>
              )}

              <div className="space-y-2 max-h[80vh] overflow-y-auto pr-1">
                {visibleProjects.map((p) => (
                  <div
                    key={p._id}
                    className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 flex items-center justify-between group hover:border-white/30 hover:bg-white/10 cursor-pointer backdrop-blur-md transition-all"
                    onClick={() => navigate(`/builder/${p._id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {p.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.score !== undefined && (
                        <span className="text-xs text-zinc-200 border border-white/20 rounded-full px-2 py-0.5">
                          {Math.round(p.score * 100)}% match
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p._id);
                          setResults(
                            (r) => r && r.filter((x) => x._id !== p._id),
                          );
                        }}
                        className="border border-white/10 text-zinc-200 hover:text-red-400 hover:border-white/40 p-1.5 rounded-md cursor-pointer transition-opacity"
                      >
                        <Trash2Icon size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
