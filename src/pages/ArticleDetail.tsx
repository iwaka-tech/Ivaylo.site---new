import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Tag, ArrowLeft, Music, Video, MessageSquare, Send, User, Instagram, Reply } from 'lucide-react';

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

interface Comment {
  id: string;
  article_id: string;
  parent_id: string | null;
  name: string;
  instagram: string | null;
  content: string;
  created_at: string;
}

export const ArticleDetail = () => {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Comment form state
  const [commentName, setCommentName] = useState('');
  const [commentInsta, setCommentInsta] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchArticle();
    fetchComments();
  }, [id]);

  const fetchArticle = () => {
    fetch('/api/articles')
      .then(res => res.json())
      .then(data => {
        const found = data.find((a: any) => a.id === id);
        setArticle(found);
        setLoading(false);
      });
  };

  const fetchComments = () => {
    fetch(`/api/articles/${id}/comments`)
      .then(res => res.json())
      .then(setComments);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/articles/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: commentName || 'Анонимен',
          instagram: commentInsta,
          content: commentContent,
          parent_id: replyTo
        })
      });

      if (res.ok) {
        setCommentContent('');
        setCommentName('');
        setCommentInsta('');
        setReplyTo(null);
        fetchComments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCommentForm = (isReply = false) => (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`${isReply ? 'mt-4 mb-8 ml-4' : 'mb-12'} bg-white/5 rounded-[2rem] border border-white/10 p-8`}
    >
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        {isReply ? <Reply size={18} className="text-cyan-400" /> : <MessageSquare size={18} className="text-cyan-400" />}
        {isReply ? 'Отговор на коментар' : 'Остави коментар'}
        {isReply && (
          <button 
            onClick={() => setReplyTo(null)}
            className="text-xs text-gray-500 hover:text-white ml-2 underline"
          >
            Отказ
          </button>
        )}
      </h3>
      <form onSubmit={handlePostComment} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-widest ml-1">Име (или анонимен)</label>
            <input
              type="text"
              placeholder="Твоето име"
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-widest ml-1">Instagram (опционално)</label>
            <input
              type="text"
              placeholder="@username"
              value={commentInsta}
              onChange={(e) => setCommentInsta(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-widest ml-1">Съобщение</label>
          <textarea
            placeholder="Напиши своя коментар тук..."
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-cyan-500/50 transition-all resize-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send size={18} />
              <span>Публикувай</span>
            </>
          )}
        </button>
      </form>
    </motion.div>
  );

  const renderComments = (parentId: string | null = null, depth = 0) => {
    const filtered = comments.filter(c => c.parent_id === parentId);
    if (filtered.length === 0) return null;

    return (
      <div className={`space-y-6 ${depth > 0 ? 'ml-6 md:ml-12 mt-6 border-l border-white/10 pl-6' : ''}`}>
        {filtered.map(comment => (
          <div key={comment.id} className="group">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <User size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{comment.name}</span>
                      {comment.instagram && (
                        <a 
                          href={`https://instagram.com/${comment.instagram.replace('@', '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-pink-500 hover:text-pink-400 transition-colors"
                        >
                          <Instagram size={14} />
                        </a>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                      {new Date(comment.created_at).toLocaleString('bg-BG')}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setReplyTo(comment.id);
                    setCommentContent('');
                  }}
                  className={`transition-colors flex items-center gap-1 text-xs uppercase tracking-widest ${replyTo === comment.id ? 'text-cyan-400' : 'text-gray-500 hover:text-cyan-400'}`}
                >
                  <Reply size={14} />
                  Отговор
                </button>
              </div>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
            </div>
            
            <AnimatePresence>
              {replyTo === comment.id && renderCommentForm(true)}
            </AnimatePresence>

            {renderComments(comment.id, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!article) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <h1 className="text-2xl font-bold mb-4">Статията не е намерена</h1>
      <Link to="/" className="text-cyan-400 hover:underline flex items-center gap-2">
        <ArrowLeft size={18} /> Обратно към началото
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] pt-24 md:pt-32 pb-20 px-4 md:px-6 relative overflow-hidden">
      {/* Print Styles */}
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-container { background: white !important; color: black !important; padding: 0 !important; border: none !important; }
          .text-white { color: black !important; }
          .text-gray-400 { color: #666 !important; }
          .bg-white\\/5 { background: transparent !important; }
          .border { border: none !important; }
        }
        .article-content h1 { font-size: 2rem; font-weight: bold; margin-bottom: 1rem; color: white; }
        .article-content h2 { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.75rem; color: white; }
        .article-content h3 { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; color: white; }
        .article-content p { margin-bottom: 1rem; line-height: 1.7; color: #94a3b8; }
        .article-content ul, .article-content ol { margin-bottom: 1rem; padding-left: 1.5rem; color: #94a3b8; }
        .article-content ul { list-style-type: disc; }
        .article-content ol { list-style-type: decimal; }
        .article-content a { color: #22d3ee; text-decoration: underline; }
        .article-content .ql-size-8 { font-size: 8px; }
        .article-content .ql-size-9 { font-size: 9px; }
        .article-content .ql-size-10 { font-size: 10px; }
        .article-content .ql-size-11 { font-size: 11px; }
        .article-content .ql-size-12 { font-size: 12px; }
        .article-content .ql-size-13 { font-size: 13px; }
        .article-content .ql-size-14 { font-size: 14px; }
        .article-content .ql-size-15 { font-size: 15px; }
        .article-content .ql-size-16 { font-size: 16px; }
        .article-content .ql-size-18 { font-size: 18px; }
        .article-content .ql-size-20 { font-size: 20px; }
        .article-content .ql-size-22 { font-size: 22px; }
        .article-content .ql-size-24 { font-size: 24px; }
        .article-content .ql-size-26 { font-size: 26px; }
        .article-content .ql-size-28 { font-size: 28px; }
        .article-content .ql-size-30 { font-size: 30px; }
        .article-content .ql-size-36 { font-size: 36px; }
        .article-content .ql-size-40 { font-size: 40px; }
        .article-content .ql-size-48 { font-size: 48px; }
        .article-content .ql-size-50 { font-size: 50px; }
        .article-content .ql-size-60 { font-size: 60px; }
        .article-content .ql-size-64 { font-size: 64px; }
        .article-content .ql-size-72 { font-size: 72px; }
        .article-content .ql-size-80 { font-size: 80px; }
        .article-content .ql-size-96 { font-size: 96px; }
        .article-content img { max-width: 100%; height: auto; border-radius: 1rem; margin: 1.5rem 0; }
        .article-content iframe { width: 100%; aspect-ratio: 16/9; border-radius: 1rem; margin: 1.5rem 0; }
        .article-content video { max-width: 100%; border-radius: 1rem; margin: 1.5rem 0; }
      `}</style>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-8 no-print">
          <Link 
            to={article.category === 'blog' ? '/blog' : '/useful'} 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Назад</span>
          </Link>
        </div>

        <motion.article 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="print-container bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl mb-12"
        >
          {article.media_url && (
            <div className="w-full aspect-video bg-black overflow-hidden no-print">
              {article.media_type === 'image' && (
                <img 
                  src={article.media_url} 
                  alt={article.title} 
                  className="w-full h-full object-cover"
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
                  <audio src={article.media_url} controls className="absolute bottom-8 left-8 right-8 w-[calc(100%-64px)]" />
                </div>
              )}
            </div>
          )}

          <div className="p-8 md:p-12">
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-6 uppercase tracking-widest">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{new Date(article.created_at).toLocaleDateString('bg-BG')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Tag size={14} />
                <span>{article.category}</span>
              </div>
              {article.tag && (
                <div className="flex items-center gap-1 text-cyan-400">
                  <span>•</span>
                  <span>{article.tag}</span>
                </div>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
              {article.title}
            </h1>

            <div 
              className="article-content"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>
        </motion.article>

        {/* Comments Section */}
        <section className="no-print">
          <div className="flex items-center gap-3 mb-8">
            <MessageSquare size={24} className="text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">Коментари ({comments.length})</h2>
          </div>

          {/* Comment Form */}
          {!replyTo && renderCommentForm()}

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-[2rem] border border-white/10">
              <p className="text-gray-500">Все още няма коментари. Бъди първият!</p>
            </div>
          ) : (
            renderComments()
          )}
        </section>
      </div>
    </div>
  );
};
