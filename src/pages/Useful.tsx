import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Tag, FileText, Music, Video, ExternalLink, ArrowRight } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tag: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
}

export const Useful = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const articlesPerPage = 6; // Increased for grid

  const usefulTags = ["Програмиране - задачи", "Как да...", "Интересно", "Други"];

  useEffect(() => {
    fetch('/api/articles?category=useful')
      .then(res => res.json())
      .then(data => {
        setArticles(data);
        setLoading(false);
      });
  }, []);

  // Filtering logic
  const filteredArticles = selectedTag 
    ? articles.filter(a => a.tag === selectedTag)
    : articles;

  // Pagination logic
  const indexOfLastArticle = currentPage * articlesPerPage;
  const indexOfFirstArticle = indexOfLastArticle - articlesPerPage;
  const currentArticles = filteredArticles.slice(indexOfFirstArticle, indexOfLastArticle);
  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTagSelect = (tag: string | null) => {
    setSelectedTag(tag);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-24 md:pt-32 pb-20 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 md:mb-16"
        >
          <h1 className="text-3xl md:text-6xl font-bold tracking-tighter text-white mb-4">Полезно</h1>
          <p className="text-gray-400 text-base md:text-lg mb-8">Ресурси, инструменти и съвети, които ще ви влязат в работа.</p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTagSelect(null)}
              className={`px-4 py-2 rounded-full text-xs font-medium uppercase tracking-widest transition-all border ${
                selectedTag === null 
                  ? 'bg-cyan-500 border-cyan-500 text-black' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
              }`}
            >
              Всички
            </button>
            {usefulTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagSelect(tag)}
                className={`px-4 py-2 rounded-full text-xs font-medium uppercase tracking-widest transition-all border ${
                  selectedTag === tag 
                    ? 'bg-cyan-500 border-cyan-500 text-black' 
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
            <FileText className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-500">Все още няма ресурси тук.</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-8">
              {currentArticles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="group bg-white/5 rounded-3xl border border-white/10 overflow-hidden hover:border-cyan-500/30 transition-all duration-500 flex flex-col"
                >
                  {article.media_url && (
                    <div className="w-full aspect-video bg-black overflow-hidden relative">
                      {article.media_type === 'image' && (
                        <img 
                          src={article.media_url} 
                          alt={article.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      {article.media_type === 'video' && (
                        <video 
                          src={article.media_url} 
                          controls 
                          className="w-full h-full object-contain"
                        />
                      )}
                      {article.media_type === 'audio' && (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-900/20 to-indigo-900/20">
                          <Music size={48} className="text-cyan-400/50" />
                          <audio src={article.media_url} controls className="absolute bottom-4 left-4 right-4 w-[calc(100%-32px)]" />
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="p-6 flex-grow">
                    <Link to={`/article/${article.id}`}>
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                        {article.title}
                      </h3>
                    </Link>
                    <div 
                      className="text-gray-400 text-sm line-clamp-3 mb-4"
                      dangerouslySetInnerHTML={{ __html: article.content }}
                    />
                  </div>
                  
                  <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-gray-500">
                        {new Date(article.created_at).toLocaleDateString('bg-BG')}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-medium">
                        {article.tag || 'Други'}
                      </span>
                    </div>
                    <Link to={`/article/${article.id}`} className="text-cyan-400 hover:text-white transition-colors">
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-16">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`w-10 h-10 rounded-xl border transition-all duration-300 font-medium ${
                      currentPage === number
                        ? 'bg-cyan-500 border-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {number}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
