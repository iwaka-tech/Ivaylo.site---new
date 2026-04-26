import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, LogOut, Key, FileText, Image as ImageIcon, Music, Video, CheckCircle, Edit3, X, Users, AlertTriangle, MessageSquare, Loader2, Smile } from 'lucide-react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useGameStore } from '../store/useGameStore';
import EmojiPicker, { Theme } from 'emoji-picker-react';

// Register custom font sizes
const Size = Quill.import('formats/size') as any;
Size.whitelist = ['8', '9', '10', '11', '12', '13', '14', '15', '16', '18', '20', '22', '24', '26', '28', '30', '36', '40', '48', '50', '60', '64', '72', '80', '96'];
Quill.register(Size, true);

// Custom Video Blot to support standard HTML5 video tags instead of iframes
const BlockEmbed = Quill.import('blots/block/embed') as any;
class CustomVideoBlot extends BlockEmbed {
  static create(value: string) {
    const node = super.create();
    node.setAttribute('src', value);
    node.setAttribute('controls', 'true');
    node.setAttribute('controlsList', 'nodownload');
    node.setAttribute('style', 'max-width: 100%; border-radius: 0.5rem; margin: 10px 0;');
    return node;
  }
  static value(node: HTMLElement) {
    return node.getAttribute('src');
  }
}
CustomVideoBlot.blotName = 'customVideo';
CustomVideoBlot.tagName = 'video';
Quill.register(CustomVideoBlot);

export const Admin = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  
  // Players online count
  const players = useGameStore((state) => state.players);
  const playerCount = Object.keys(players).length + 1;

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('blog');
  const [tag, setTag] = useState('Други');
  const [file, setFile] = useState<File | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassModal, setShowPassModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  
  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Comments management state
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [articleComments, setArticleComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [showTitleEmoji, setShowTitleEmoji] = useState(false);
  const [showContentEmoji, setShowContentEmoji] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchArticles();
  }, []);

  const checkAuth = async () => {
    const res = await fetch('/api/check-auth');
    const data = await res.json();
    if (!data.authenticated) {
      navigate('/login');
    } else {
      setAuthenticated(true);
    }
  };

  const fetchArticles = async () => {
    const res = await fetch('/api/articles');
    const data = await res.json();
    setArticles(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    navigate('/login');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('category', category);
    formData.append('tag', tag);
    if (file) formData.append('media', file);

    try {
      const url = editingId ? `/api/articles/${editingId}` : '/api/articles';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        body: formData,
      });

      if (res.ok) {
        resetForm();
        fetchArticles();
      } else {
        const data = await res.json();
        setError(data.error || 'Възникна грешка при записването.');
      }
    } catch (err) {
      console.error(err);
      setError('Мрежова грешка. Моля, опитайте отново.');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setCategory('blog');
    setTag('Други');
    setFile(null);
    setError(null);
  };

  const handleEdit = (article: any) => {
    setEditingId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setTag(article.tag || 'Други');
    setFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/articles/${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    fetchArticles();
  };

  const handleChangePass = async () => {
    if (!newPass) return;
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: newPass }),
    });
    if (res.ok) {
      setShowPassModal(false);
      setNewPass('');
    }
  };

  const fetchArticleComments = async (articleId: string) => {
    setSelectedArticleId(articleId);
    setLoadingComments(true);
    setShowCommentsModal(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/comments`);
      const data = await res.json();
      setArticleComments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok && selectedArticleId) {
        setCommentToDelete(null);
        fetchArticleComments(selectedArticleId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const reactQuillRef = useRef<ReactQuill>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const uploadEditorMedia = async (file: File, type: 'image' | 'video') => {
    setIsUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload-media', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        const quill = reactQuillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          if (file.type.startsWith('video/')) {
            quill.insertEmbed(range.index, 'customVideo', data.url);
          } else {
            quill.insertEmbed(range.index, 'image', data.url);
          }
          quill.setSelection(range.index + 1, 0);
        }
      }
    } catch (err) {
      console.error('Media upload failed', err);
      setError('Грешка при качване на медия в редактора.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file) return;
      await uploadEditorMedia(file, 'image');
    };
  };

  const videoHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'video/*,image/gif');
    input.click();
    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file) return;
      await uploadEditorMedia(file, 'video');
    };
  };

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'size': ['8', '9', '10', '11', '12', '13', '14', '15', '16', '18', '20', '22', '24', '26', '28', '30', '36', '40', '48', '50', '60', '64', '72', '80', '96'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'align': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler,
        video: videoHandler
      }
    }
  }), []);

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-[#050505] pt-24 md:pt-32 pb-20 px-4 md:px-6">
      <style>{`
        .quill { background: rgba(255,255,255,0.03); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1) !important; }
        .ql-toolbar { border: none !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; background: rgba(255,255,255,0.02); overflow: visible !important; }
        @media (max-width: 640px) {
          .ql-toolbar.ql-snow { padding: 4px !important; }
          .ql-toolbar.ql-snow .ql-formats { margin-right: 4px !important; }
          .ql-snow.ql-toolbar button, .ql-snow .ql-toolbar button { padding: 2px 4px !important; width: 24px !important; height: 24px !important; }
          .ql-snow .ql-picker.ql-size { width: 44px !important; }
        }
        .ql-container { border: none !important; color: white; font-family: inherit; font-size: 1rem; }
        .ql-editor { 
          min-height: 400px; 
          padding: 2rem !important; /* Base padding */
          max-width: 896px; /* max-w-4xl */
          margin: 0 auto;
          line-height: 1.8;
          color: #cbd5e1;
        }
        
        @media (min-width: 768px) {
          .ql-editor {
            padding: 3rem !important; /* Match md:p-12 of ArticleDetail */
          }
        }
        
        /* Sync styles with ArticleDetail article-content */
        .ql-editor p { margin-bottom: 1.5rem !important; text-align: justify; hyphens: auto; }
        .ql-editor h1 { font-size: 2.5rem !important; font-weight: 800 !important; margin-bottom: 1.5rem !important; color: white !important; line-height: 1.2 !important; }
        .ql-editor h2 { font-size: 1.8rem !important; font-weight: 700 !important; margin-top: 2rem !important; margin-bottom: 1rem !important; color: white !important; line-height: 1.3 !important; }
        .ql-editor h3 { font-size: 1.4rem !important; font-weight: 600 !important; margin-top: 1.5rem !important; margin-bottom: 0.75rem !important; color: white !important; }
        .ql-editor ul, .ql-editor ol { margin-bottom: 1.5rem !important; color: #cbd5e1 !important; line-height: 1.8 !important; }
        .ql-editor a { color: #22d3ee !important; text-decoration: underline !important; }
        
        .ql-editor .ql-align-center { text-align: center !important; }
        .ql-editor .ql-align-right { text-align: right !important; }
        .ql-editor .ql-align-justify { text-align: justify !important; }
        .ql-editor .ql-align-left { text-align: left !important; }
        
        .ql-stroke { stroke: #94a3b8 !important; }
        .ql-fill { fill: #94a3b8 !important; }
        .ql-picker { color: #94a3b8 !important; }
        .ql-active .ql-stroke { stroke: #22d3ee !important; }
        .ql-active .ql-fill { fill: #22d3ee !important; }
        .ql-editor img { max-width: 100%; height: auto; border-radius: 1rem; margin: 1.5rem 0; }
        .ql-editor iframe { width: 100%; aspect-ratio: 16/9; border-radius: 1rem; margin: 1.5rem 0; }
        .ql-picker-options { background-color: #111 !important; border: 1px solid rgba(255,255,255,0.1) !important; z-index: 1000 !important; max-height: 300px !important; overflow-y: auto !important; }
        .ql-picker-item { color: #94a3b8 !important; }
        .ql-picker-item:hover { color: white !important; }
        .ql-picker-label { color: #94a3b8 !important; }
        .ql-picker-label:hover { color: white !important; }
        
        /* Tooltip fix */
        .ql-tooltip { background-color: #111 !important; border: 1px solid rgba(255,255,255,0.1) !important; color: white !important; }
        .ql-tooltip input { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: white !important; }
        /* Font size picker labels */
        .ql-snow .ql-picker.ql-size .ql-picker-label::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item::before {
          content: attr(data-value) !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label:not([data-value])::before {
          content: '14' !important;
        }
        .ql-snow .ql-picker.ql-size .ql-picker-item:not([data-value])::before {
          content: '14' !important;
        }

        /* Editor font sizes */
        .ql-editor .ql-size-8 { font-size: 8px; }
        .ql-editor .ql-size-9 { font-size: 9px; }
        .ql-editor .ql-size-10 { font-size: 10px; }
        .ql-editor .ql-size-11 { font-size: 11px; }
        .ql-editor .ql-size-12 { font-size: 12px; }
        .ql-editor .ql-size-13 { font-size: 13px; }
        .ql-editor .ql-size-14 { font-size: 14px; }
        .ql-editor .ql-size-15 { font-size: 15px; }
        .ql-editor .ql-size-16 { font-size: 16px; }
        .ql-editor .ql-size-18 { font-size: 18px; }
        .ql-editor .ql-size-20 { font-size: 20px; }
        .ql-editor .ql-size-22 { font-size: 22px; }
        .ql-editor .ql-size-24 { font-size: 24px; }
        .ql-editor .ql-size-26 { font-size: 26px; }
        .ql-editor .ql-size-28 { font-size: 28px; }
        .ql-editor .ql-size-30 { font-size: 30px; }
        .ql-editor .ql-size-36 { font-size: 36px; }
        .ql-editor .ql-size-40 { font-size: 40px; }
        .ql-editor .ql-size-48 { font-size: 48px; }
        .ql-editor .ql-size-50 { font-size: 50px; }
        .ql-editor .ql-size-60 { font-size: 60px; }
        .ql-editor .ql-size-64 { font-size: 64px; }
        .ql-editor .ql-size-72 { font-size: 72px; }
        .ql-editor .ql-size-80 { font-size: 80px; }
        .ql-editor .ql-size-96 { font-size: 96px; }

        /* Resize handles */
        .ql-editor .ql-image-resize-module { position: relative; display: inline-block; }
        .ql-editor .ql-image-resize-module .handler { position: absolute; width: 10px; height: 10px; background-color: #22d3ee; border: 1px solid white; }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="w-full md:w-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Админ Панел</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <p className="text-gray-500 text-sm">Управлявайте съдържанието на сайта си.</p>
              <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                <Users size={14} className="text-cyan-400" />
                <span className="text-[10px] font-medium text-cyan-400 uppercase tracking-wider">{playerCount} Онлайн</span>
              </div>
            </div>
          </div>
          <div className="flex w-full md:w-auto gap-3">
            <button 
              onClick={() => setShowPassModal(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2.5 rounded-xl border border-white/10 transition-all text-sm"
            >
              <Key size={16} />
              <span>Парола</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2.5 rounded-xl border border-red-500/20 transition-all text-sm"
            >
              <LogOut size={16} />
              <span>Изход</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
          {/* Create/Edit Form */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 p-6 md:p-8 rounded-[2rem] border border-white/10 lg:sticky lg:top-32">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {editingId ? <Edit3 size={20} className="text-cyan-400" /> : <Plus size={20} className="text-cyan-400" />}
                  {editingId ? 'Редактиране' : 'Нова публикация'}
                </h2>
                {editingId && (
                  <button onClick={resetForm} className="text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSave} className="space-y-5">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-center gap-2">
                    <AlertTriangle size={18} />
                    {error}
                  </div>
                )}
                <div className="space-y-2 relative">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-widest ml-1">Заглавие</label>
                    <button
                      type="button"
                      onClick={() => setShowTitleEmoji(!showTitleEmoji)}
                      className="text-gray-500 hover:text-cyan-400 transition-colors p-1"
                    >
                      <Smile size={18} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                    required
                  />
                  {showTitleEmoji && (
                    <div className="absolute bottom-full right-0 z-50 mb-2">
                      <EmojiPicker
                        theme={Theme.DARK}
                        onEmojiClick={(emojiData) => {
                          setTitle(prev => prev + emojiData.emoji);
                          setShowTitleEmoji(false);
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-widest ml-1">Категория</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setTag('Други');
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                  >
                    <option value="blog" className="bg-black">Блог</option>
                    <option value="useful" className="bg-black">Полезно</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-widest ml-1">Таг / Етикет</label>
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                  >
                    {category === 'blog' ? (
                      <>
                        <option value="Преживявания" className="bg-black">Преживявания</option>
                        <option value="Мнения" className="bg-black">Мнения</option>
                        <option value="Творби" className="bg-black">Творби</option>
                        <option value="Други" className="bg-black">Други</option>
                      </>
                    ) : (
                      <>
                        <option value="Програмиране - задачи" className="bg-black">Програмиране - задачи</option>
                        <option value="Как да..." className="bg-black">Как да...</option>
                        <option value="Интересно" className="bg-black">Интересно</option>
                        <option value="Други" className="bg-black">Други</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-2 relative">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-widest ml-1">Съдържание</label>
                    <div className="flex items-center gap-2">
                      {isUploadingMedia && (
                        <div className="flex items-center gap-2 text-cyan-400 text-xs font-medium">
                          <Loader2 size={14} className="animate-spin" />
                          Качване на файл...
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowContentEmoji(!showContentEmoji)}
                        className="text-gray-500 hover:text-cyan-400 transition-colors p-1"
                        title="Добави емоджи"
                      >
                        <Smile size={18} />
                      </button>
                    </div>
                  </div>
                  <ReactQuill 
                    ref={reactQuillRef}
                    theme="snow" 
                    value={content} 
                    onChange={setContent}
                    modules={quillModules}
                  />
                  {showContentEmoji && (
                    <div className="absolute bottom-full right-0 z-50 mb-2">
                      <EmojiPicker
                        theme={Theme.DARK}
                        onEmojiClick={(emojiData) => {
                          const quill = reactQuillRef.current?.getEditor();
                          if (quill) {
                            const range = quill.getSelection();
                            if (range) {
                              quill.insertText(range.index, emojiData.emoji);
                            } else {
                              quill.insertText(quill.getLength() - 1, emojiData.emoji);
                            }
                          }
                          setShowContentEmoji(false);
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-widest ml-1">Медия (Остави празно за запазване)</label>
                  <div className="relative group">
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      accept="image/*,audio/*,video/*"
                    />
                    <div className="w-full bg-white/5 border border-dashed border-white/20 rounded-xl py-6 px-4 text-center group-hover:border-cyan-500/50 transition-all">
                      {file ? (
                        <div className="flex items-center justify-center gap-2 text-cyan-400">
                          <CheckCircle size={18} />
                          <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">
                          Кликнете за избор на файл
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {editingId ? <CheckCircle size={18} /> : <Plus size={18} />}
                      <span>{editingId ? 'Запази промените' : 'Публикувай'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 p-6 md:p-8 rounded-[2rem] border border-white/10">
              <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                <FileText size={20} className="text-cyan-400" />
                Всички публикации
              </h2>
              
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : articles.length === 0 ? (
                <p className="text-gray-500 text-center py-10">Няма намерени публикации.</p>
              ) : (
                <div className="space-y-4">
                  {articles.map((article) => (
                    <div key={article.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group gap-4">
                      <div className="flex items-center gap-4 overflow-hidden w-full sm:w-auto">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                          {article.media_type === 'image' && <ImageIcon size={20} className="text-cyan-400" />}
                          {article.media_type === 'audio' && <Music size={20} className="text-indigo-400" />}
                          {article.media_type === 'video' && <Video size={20} className="text-purple-400" />}
                          {!article.media_type && <FileText size={20} className="text-gray-400" />}
                        </div>
                        <div className="truncate flex-grow">
                          <h4 className="text-white font-medium truncate text-sm md:text-base">{article.title}</h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-widest text-gray-500">
                            <span>{article.category}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-cyan-400/70">{article.tag || 'Други'}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{new Date(article.created_at).toLocaleDateString('bg-BG')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-end sm:opacity-0 sm:group-hover:opacity-100 transition-all border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                        <button 
                          onClick={() => fetchArticleComments(article.id)}
                          className="p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all"
                          title="Коментари"
                        >
                          <MessageSquare size={18} />
                        </button>
                        <button 
                          onClick={() => handleEdit(article)}
                          className="p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => setDeleteId(article.id)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPassModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md bg-[#111] p-8 rounded-3xl border border-white/10 shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Смяна на парола</h3>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Нова парола"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-cyan-500/50"
              />
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleChangePass}
                  className="flex-grow bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-3 rounded-xl transition-all"
                >
                  Запази
                </button>
                <button 
                  onClick={() => setShowPassModal(false)}
                  className="px-6 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl border border-white/10 transition-all"
                >
                  Отказ
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setDeleteId(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[#111] p-8 rounded-3xl border border-red-500/20 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Изтриване на статия?</h3>
              <p className="text-gray-400 text-sm mb-8">Това действие е необратимо. Сигурни ли сте?</p>
              <div className="flex gap-3">
                <button 
                  onClick={confirmDelete}
                  className="flex-grow bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Изтрий
                </button>
                <button 
                  onClick={() => setDeleteId(null)}
                  className="flex-grow bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl border border-white/10 transition-all"
                >
                  Отказ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comments Management Modal */}
      <AnimatePresence>
        {showCommentsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setShowCommentsModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#111] p-8 rounded-3xl border border-white/10 shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <MessageSquare size={24} className="text-cyan-400" />
                  Управление на коментари
                </h3>
                <button onClick={() => setShowCommentsModal(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {loadingComments ? (
                  <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : articleComments.length === 0 ? (
                  <p className="text-gray-500 text-center py-10">Няма коментари за тази статия.</p>
                ) : (
                  articleComments.map((comment) => (
                    <div key={comment.id} className="bg-white/5 rounded-xl p-4 border border-white/5 flex justify-between items-start gap-4">
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white text-sm">{comment.name}</span>
                          {comment.instagram && <span className="text-pink-500 text-xs">{comment.instagram}</span>}
                          {comment.parent_id && <span className="bg-cyan-500/10 text-cyan-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter">Отговор</span>}
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-3">{comment.content}</p>
                        <span className="text-[10px] text-gray-600 uppercase tracking-widest mt-2 block">
                          {new Date(comment.created_at).toLocaleString('bg-BG')}
                        </span>
                      </div>
                      
                      {commentToDelete === comment.id ? (
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => handleDeleteComment(comment.id)}
                            className="px-3 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600 transition-all uppercase"
                          >
                            Изтрий
                          </button>
                          <button 
                            onClick={() => setCommentToDelete(null)}
                            className="px-3 py-1 bg-white/10 text-gray-400 text-[10px] font-bold rounded-lg hover:bg-white/20 transition-all uppercase"
                          >
                            Отказ
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setCommentToDelete(comment.id)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all flex-shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
