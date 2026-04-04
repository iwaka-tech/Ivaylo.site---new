import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Tag, FileText, Music, Video, ArrowRight } from 'lucide-react';

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

export const Blog = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const articlesPerPage = 5;

  const blogTags = ["Преживявания", "Мнения", "Творби", "Други"];

  useEffect(() => {
    fetch('/api/articles?category=blog')
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
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 md:mb-16"
        >
          <h1 className="text-3xl md:text-6xl font-bold tracking-tighter text-white mb-4">Блог</h1>
          <p className="text-gray-400 text-base md:text-lg mb-8">Мисли, истории и технологични открития.</p>

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
            {blogTags.map(tag => (
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
            <p className="text-gray-500">Все още няма статии тук.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-12">
              {currentArticles.map((article, index) => (
                <motion.article
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative bg-white/5 rounded-3xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-500"
                >
                  {article.media_url && (
                    <div className="w-full aspect-video bg-black overflow-hidden">
                      {article.media_type === 'image' && (
                        <img 
                          src={article.media_url} 
                          alt={article.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
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
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/20 to-cyan-900/20">
                          <Music size={64} className="text-cyan-400/50" />
                          <audio src={article.media_url} controls className="absolute bottom-4 left-4 right-4 w-[calc(100%-32px)]" />
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="p-8">
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{new Date(article.created_at).toLocaleDateString('bg-BG')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag size={14} />
                        <span>{article.tag || 'Други'}</span>
                      </div>
                    </div>
                    
                    <Link to={`/article/${article.id}`}>
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">
                        {article.title}
                      </h2>
                    </Link>
                    
                    <div className="text-gray-400 leading-relaxed line-clamp-3 mb-6" dangerouslySetInnerHTML={{ __html: article.content }} />
                    
                    <Link 
                      to={`/article/${article.id}`}
                      className="inline-flex items-center gap-2 text-cyan-400 hover:text-white transition-colors text-sm font-medium group/btn"
                    >
                      <span>Прочети повече</span>
                      <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.article>
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
