import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Sparkles, 
  Image as ImageIcon, 
  Loader2, 
  ChevronRight,
  RefreshCw,
  Download,
  Info,
  ChevronLeft
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Types ---
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface Style {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

// --- Constants ---
const STYLES: Style[] = [
  {
    id: 'new-chinese',
    name: '新中式',
    description: '现代中式，极简线条，胡桃木色，优雅平衡。',
    prompt: 'Modern New Chinese style, minimalist lines, walnut wood textures, elegant balance, ink wash aesthetics.'
  },
  {
    id: 'classic-chinese',
    name: '古典中式',
    description: '红木家具，格栅屏风，丝绸质感，传统韵味。',
    prompt: 'Classic Chinese style, rosewood furniture, lattice screens, silk textures, traditional charm.'
  },
  {
    id: 'luxury',
    name: '轻奢风',
    description: '高品质材质，金属点缀，精致优雅。',
    prompt: 'Light luxury style, high-quality materials, metal accents, exquisite and elegant, marble textures.'
  },
  {
    id: 'french',
    name: '法式风',
    description: '浪漫雕花，柔和色调，复古家具，艺术气息。',
    prompt: 'French style, romantic carvings, soft color tones, vintage furniture, artistic atmosphere, plaster lines.'
  },
  {
    id: 'modern',
    name: '现代简约',
    description: '黑白灰调，利落线条，通透空间，功能至上。',
    prompt: 'Modern minimalist style, black white and gray tones, clean lines, transparent space, functionality first.'
  },
  {
    id: 'nordic',
    name: '北欧风',
    description: '浅色系 + 原木材质，采光优先，清新干净。',
    prompt: 'Nordic style, light colors, natural wood materials, bright natural lighting, clean and fresh.'
  },
  {
    id: 'japanese',
    name: '日式风',
    description: '原木 + 留白，极简禅意，温润质朴。',
    prompt: 'Japanese Zen style, wood and white space, minimalist, warm and rustic texture.'
  },
  {
    id: 'cream',
    name: '奶油风',
    description: '奶白 / 奶咖色调，弧形元素，温柔治愈。',
    prompt: 'Creamy style, off-white and milk coffee tones, curved elements, soft lighting, gentle and healing.'
  },
  {
    id: 'wabi-sabi',
    name: '侘寂风',
    description: '大地色系、微水泥质感，追求质朴残缺美。',
    prompt: 'Wabi-sabi style, earth tones, micro-cement texture, rustic beauty, relaxed and quiet.'
  },
  {
    id: 'industrial',
    name: '工业风',
    description: '裸露水泥 / 砖墙、金属铁艺，冷硬粗犷。',
    prompt: 'Industrial style, exposed concrete or brick walls, metal ironwork, rugged and cool.'
  }
];

// --- Utilities ---
const resizeImage = (base64Str: string, maxSize: number): Promise<{ data: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = (maxSize / width) * height;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (maxSize / height) * width;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ data: base64Str, width: img.width, height: img.height });
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ 
        data: canvas.toDataURL('image/jpeg', 0.8),
        width,
        height
      });
    };
    img.onerror = reject;
  });
};

// --- Components ---
const BeforeAfterSlider = ({ before, after }: { before: string; after: string }) => {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging) handleMove(e.touches[0].clientX);
    };
    const onStop = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onStop);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onStop);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onStop);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onStop);
    };
  }, [isDragging, handleMove]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none cursor-ew-resize rounded-2xl"
      onMouseDown={(e) => {
        if (e.button === 0) {
          setIsDragging(true);
          handleMove(e.clientX);
        }
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
      }}
    >
      {/* Before Image (Bottom) */}
      <img 
        src={before} 
        alt="Before" 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
        referrerPolicy="no-referrer"
        draggable="false"
      />
      
      {/* After Image (Top with Clip) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        <img 
          src={after} 
          alt="After" 
          className="absolute inset-0 w-full h-full object-cover" 
          referrerPolicy="no-referrer"
          draggable="false"
        />
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)] pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center border border-slate-200">
          <div className="flex gap-1">
            <ChevronLeft className="w-4 h-4 text-slate-400 -mr-1" />
            <ChevronRight className="w-4 h-4 text-slate-400 -ml-1" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-md text-slate-900 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-100 pointer-events-none uppercase tracking-wider">
        毛坯原图
      </div>
      <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/10 pointer-events-none uppercase tracking-wider">
        装修效果
      </div>
    </div>
  );
};

export default function App() {
  const [selectedStyle, setSelectedStyle] = useState<Style>(STYLES[0]);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("AI 正在为您精心装修...");
  const [imageRatio, setImageRatio] = useState<"1:1" | "3:4" | "4:3" | "9:16" | "16:9">("16:9");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash-image");
  const [selectedQuality, setSelectedQuality] = useState<string>("1080p");
  
  // SaaS States
  const [saasUser, setSaasUser] = useState<{ userId: string; name: string; enterprise: string; integral: number } | null>(null);
  const [saasTool, setSaasTool] = useState<{ toolId: string; name: string; integral: number } | null>(null);

  const [durations, setDurations] = useState<{
    resize?: number;
    ai?: number;
    total?: number;
  }>({});

  const loadingMessages = [
    "正在测量房间尺寸...",
    "正在粉刷墙面...",
    "正在铺设高级地板...",
    "正在搬运家具...",
    "正在调试灯光氛围...",
    "正在进行最后的软装点缀...",
    "大功告成，正在渲染效果图..."
  ];

  // Loading message rotation
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      let index = 0;
      interval = setInterval(() => {
        setLoadingMessage(loadingMessages[index % loadingMessages.length]);
        index++;
      }, 2000);
    } else {
      setLoadingMessage("AI 正在为您精心装修...");
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      // First check if we are in AI Studio environment
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
          setHasApiKey(true);
          return;
        }
      }

      // Then check if the backend has the key configured
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setHasApiKey(data.geminiConfigured);
      } catch (error) {
        console.error('Health check failed:', error);
        // Fallback to checking process.env for local dev
        setHasApiKey(!!process.env.GEMINI_API_KEY);
      }
    };
    checkKey();
  }, []);

  // postMessage listener for SaaS Init
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SAAS_INIT') {
        const { userId, toolId } = event.data;
        // Filter invalid strings
        if (!userId || userId === 'null' || userId === 'undefined' || !toolId || toolId === 'null' || toolId === 'undefined') {
          console.warn('Invalid SaaS IDs received:', { userId, toolId });
          return;
        }
        
        try {
          const response = await fetch('/api/tool/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, toolId })
          });
          const result = await response.json();
          if (result.success) {
            setSaasUser({ ...result.data.user, userId });
            setSaasTool({ ...result.data.tool, toolId });
          }
        } catch (error) {
          console.error('SaaS launch failed:', error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const startResize = Date.now();
        // Resize image before setting it to state to avoid large payloads
        try {
          const { data, width, height } = await resizeImage(base64, 1024);
          setOriginalImage(data);
          
          // Detect aspect ratio
          const ratio = width / height;
          if (ratio >= 1.5) {
            setImageRatio("16:9");
          } else if (ratio >= 1.1) {
            setImageRatio("4:3");
          } else if (ratio >= 0.85) {
            setImageRatio("1:1");
          } else if (ratio >= 0.65) {
            setImageRatio("3:4");
          } else {
            setImageRatio("9:16");
          }

          setDurations(prev => ({ ...prev, resize: Date.now() - startResize }));
        } catch (e) {
          console.error("Resize error:", e);
          setOriginalImage(base64);
        }
        setGeneratedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const handleGenerate = async () => {
    if (!originalImage) return;

    setIsGenerating(true);
    setError(null);
    const startTime = Date.now();
    setDurations({});

    // 1. SaaS Verify Integral
    if (saasUser && saasTool) {
      try {
        const verifyRes = await fetch('/api/tool/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: saasUser.userId, toolId: saasTool.toolId })
        });
        const verifyResult = await verifyRes.json();
        if (!verifyResult.success) {
          setError(verifyResult.message || '积分不足，无法生成');
          setIsGenerating(false);
          return;
        }
      } catch (error) {
        console.error('SaaS verify failed:', error);
        // Loose validation: proceed if proxy fails
      }
    }

    // Note: In production (Vercel), we use a backend proxy to handle generation 
    // to bypass regional restrictions and secure the API key.
    
    try {
      const base64Data = originalImage.split(',')[1];
      
      const prompt = `
        Interior Design Transformation:
        Style: ${selectedStyle.name}
        Details: ${selectedStyle.description}
        Visual Theme: ${selectedStyle.prompt}
        
        STRICT REQUIREMENTS:
        1. NO STRUCTURAL CHANGES: Do not move or remove walls, windows, doors, or ceilings.
        2. SURFACE OVERLAY ONLY: Apply new textures, colors, and finishes to existing surfaces.
        3. PRESERVE ARCHITECTURE: Maintain the exact perspective and physical layout of the original room.
        4. ADD DECORATION: Add stylish furniture, lighting, and decor that fits the "${selectedStyle.name}" style.
        5. HIGH QUALITY: Output a professional, photorealistic interior design rendering.
      `;

      // Add a 300-second timeout to the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT")), 300000);
      });

      const generateWithRetry = async (retries = 1): Promise<any> => {
        const startAi = Date.now();
        try {
          const config: any = {
            systemInstruction: "You are a professional interior designer specializing in image-to-image room transformation. STRICT RULE: NO STRUCTURAL CHANGES. SURFACE OVERLAY ONLY. PRESERVE ALL ORIGINAL WALLS, WINDOWS, DOORS, AND CEILING POSITIONS. ONLY CHANGE TEXTURES, COLORS, AND ADD FURNITURE. DO NOT ALTER THE PHYSICAL ARCHITECTURE OF THE ROOM. MAINTAIN THE ORIGINAL PERSPECTIVE.",
            imageConfig: {
              aspectRatio: imageRatio
            }
          };

          if (selectedModel === 'gemini-3.1-flash-image-preview') {
            config.imageConfig.imageSize = selectedQuality;
          }

          // Use backend proxy to bypass regional restrictions and secure API key
          const generatePromise = fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: selectedModel,
              contents: [
                {
                  parts: [
                    { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
                    { text: prompt }
                  ]
                }
              ],
              config
            })
          }).then(async res => {
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
            }
            return res.json();
          });

          const result = await Promise.race([generatePromise, timeoutPromise]);
          setDurations(prev => ({ ...prev, ai: (prev.ai || 0) + (Date.now() - startAi) }));
          return result;
        } catch (err: any) {
          setDurations(prev => ({ ...prev, ai: (prev.ai || 0) + (Date.now() - startAi) }));
          if (retries > 0 && (err.message === "TIMEOUT" || err.message.includes("500") || err.message.includes("INTERNAL"))) {
            console.log("Retrying generation...");
            return generateWithRetry(retries - 1);
          }
          throw err;
        }
      };

      const response = await generateWithRetry();

      if (!response.candidates?.[0]?.content?.parts) {
        throw new Error("AI 未能返回有效内容，请重试。");
      }

      let foundImage = false;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setGeneratedImage(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        const textFeedback = response.candidates[0].content.parts.find(p => p.text)?.text;
        throw new Error(textFeedback || "AI 未能生成图片，可能是由于图片内容受限。");
      }

      // 2. SaaS Consume Integral
      if (saasUser && saasTool) {
        try {
          const consumeRes = await fetch('/api/tool/consume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: saasUser.userId, toolId: saasTool.toolId })
          });
          const consumeResult = await consumeRes.json();
          if (consumeResult.success) {
            setSaasUser(prev => prev ? { ...prev, integral: consumeResult.data.currentIntegral } : null);
          }
        } catch (error) {
          console.error('SaaS consume failed:', error);
        }
      }

      setDurations(prev => ({ ...prev, total: Date.now() - startTime }));
    } catch (err: any) {
      console.error("Generation error:", err);
      let msg = "生成失败，请稍后重试。";
      
      if (err.message === "TIMEOUT") {
        msg = "生成超时：AI 响应时间过长，请尝试上传一张尺寸更小的照片或更换风格。";
      } else if (err.message.includes("API Key")) {
        msg = "API Key 错误：请确保已在环境变量中正确配置 GEMINI_API_KEY。";
      } else {
        let apiError = null;
        try {
          apiError = typeof err.message === 'string' && err.message.startsWith('{') ? JSON.parse(err.message) : null;
        } catch (e) {}
        
        const errorStatus = apiError?.error?.status || "";
        const errorMessage = apiError?.error?.message || err.message || "";
        const errorCode = apiError?.error?.code || "";

        if (errorStatus === "PERMISSION_DENIED" || errorMessage.includes("permission")) {
          msg = "权限不足 (403)：请点击下方按钮重新选择一个【已开启结算】的 API Key。";
          setHasApiKey(false);
        } else if (errorMessage.includes("entity was not found")) {
          msg = "模型不可用：请尝试重新选择 API Key。";
          setHasApiKey(false);
        } else if (errorCode === 500 || errorStatus === "INTERNAL") {
          msg = "服务器繁忙 (500)：AI 暂时无法处理您的请求，请尝试上传一张更清晰、尺寸更小的照片。";
        } else {
          msg = errorMessage || msg;
        }
      }
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `renovated-${selectedStyle.id}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col font-sans text-[#1a1a1a]">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">AI 室内设计助手</h1>
        </div>
        <div className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
          CORE EDITION V2.0
        </div>
      </header>

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pb-12 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
        {/* Left Column: Controls */}
        <div className="flex flex-col gap-8">
          {/* SaaS User Info */}
          {saasUser && (
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
                  {saasUser.name[0]}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{saasUser.name}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">{saasUser.enterprise}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                <span className="text-xs text-slate-500">剩余积分</span>
                <span className="font-mono font-bold text-black">{saasUser.integral}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col h-full">
            <h2 className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-wider">1. 选择装修风格</h2>
            
            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[calc(100vh-500px)]">
              {STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style)}
                  className={cn(
                    "w-full text-left p-5 rounded-2xl transition-all duration-200 bg-white border",
                    selectedStyle.id === style.id 
                      ? "border-black ring-1 ring-black shadow-lg" 
                      : "border-slate-100 hover:border-slate-300 shadow-sm"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "font-bold text-base",
                      selectedStyle.id === style.id ? "text-black" : "text-slate-700"
                    )}>
                      {style.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {style.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">2. 生成模型 & 画质</h2>
                <div className="space-y-3">
                  {/* Model Select */}
                  <div className="relative">
                    <select
                      value={selectedModel}
                      onChange={(e) => {
                        const model = e.target.value;
                        setSelectedModel(model);
                        if (model === "gemini-2.5-flash-image") {
                          setSelectedQuality("1080p");
                        } else {
                          setSelectedQuality("1K");
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    >
                      <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (标准)</option>
                      <option value="gemini-3.1-flash-image-preview">Gemini 3.1 Flash (高清)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
                    </div>
                  </div>

                  {/* Quality Select */}
                  <div className="relative">
                    <select
                      value={selectedQuality}
                      onChange={(e) => setSelectedQuality(e.target.value)}
                      disabled={selectedModel === "gemini-2.5-flash-image"}
                      className={cn(
                        "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all",
                        selectedModel === "gemini-2.5-flash-image" && "bg-slate-50 text-slate-400 cursor-not-allowed opacity-60"
                      )}
                    >
                      {selectedModel === "gemini-2.5-flash-image" ? (
                        <option value="1080p">1080p (标准画质)</option>
                      ) : (
                        <>
                          <option value="1K">1K (高清)</option>
                          <option value="2K">2K (超清)</option>
                          <option value="4K">4K (极致)</option>
                        </>
                      )}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button
                onClick={handleGenerate}
                disabled={!originalImage || isGenerating}
                className={cn(
                  "w-full py-5 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all duration-300",
                  !originalImage || isGenerating
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-black text-white hover:bg-slate-800 active:scale-[0.98] shadow-xl shadow-black/10"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    生成装修方案
                  </>
                )}
              </button>
              
              {!hasApiKey && hasApiKey !== null && (
                <button
                  onClick={handleSelectKey}
                  className="w-full mt-4 py-3 bg-slate-50 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  重新选择 API Key
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="w-full flex flex-col items-center justify-start py-4">
          <div className={cn(
            "relative group transition-all duration-500 ease-in-out bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center mx-auto w-full",
            !originalImage ? "aspect-[16/9] max-w-5xl bg-slate-50/50" : 
            imageRatio === "16:9" ? "aspect-[16/9] max-w-5xl" : 
            imageRatio === "4:3" ? "aspect-[4/3] max-w-4xl" :
            imageRatio === "1:1" ? "aspect-square max-w-[600px]" :
            imageRatio === "3:4" ? "aspect-[3/4] max-w-[500px]" : "aspect-[9/16] max-w-[450px]"
          )} style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {!originalImage ? (
              <div 
                {...getRootProps()} 
                className={cn(
                  "w-full h-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer p-12 text-center",
                  isDragActive ? "bg-slate-100" : "hover:bg-slate-100/50"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">上传毛坯房实拍</h3>
                <p className="text-slate-400 text-sm max-w-xs leading-relaxed mb-8">
                  我们将严格保留原始建筑结构，为您叠加全覆盖的精美装修方案。
                </p>
                <div className="px-10 py-4 bg-black text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-black/10">
                  选择照片
                </div>
              </div>
            ) : (
              <div className="w-full h-full relative">
                {generatedImage ? (
                  <div className="w-full h-full relative">
                    <BeforeAfterSlider before={originalImage} after={generatedImage} />
                    
                    <div className="absolute top-6 right-6 flex gap-2">
                      <button 
                        onClick={handleDownload}
                        className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg hover:bg-white transition-all active:scale-95 text-slate-900 flex items-center gap-2 font-bold text-xs"
                      >
                        <Download className="w-4 h-4" />
                        下载方案
                      </button>
                      <button 
                        onClick={() => {
                          setOriginalImage(null);
                          setGeneratedImage(null);
                          setImageRatio("16:9");
                        }}
                        className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg hover:bg-white transition-all active:scale-95 text-slate-600"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full relative flex items-center justify-center">
                    <img 
                      src={originalImage} 
                      alt="Original" 
                      className={cn(
                        "w-full h-full object-cover transition-all duration-700",
                        isGenerating ? "blur-xl scale-110 opacity-50" : ""
                      )}
                      referrerPolicy="no-referrer"
                    />
                    
                    {isGenerating ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-md">
                        <div className="relative mb-8">
                          <div className="w-16 h-16 border-2 border-black/10 border-t-black rounded-full animate-spin"></div>
                          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-black animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-black mb-2">
                          {loadingMessage}
                        </h3>
                        <p className="text-slate-500 text-xs animate-pulse">预计需要 30-60 秒，请耐心等待...</p>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-xl shadow-xl flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-black" />
                          <p className="font-bold text-slate-900 text-xs">
                            已准备就绪，请点击左侧按钮生成
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            setOriginalImage(null);
                            setImageRatio("16:9");
                          }}
                          className="absolute top-6 right-6 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg hover:bg-white transition-colors text-slate-600"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 bg-white/98 backdrop-blur-xl p-10 flex flex-col items-center justify-center text-center z-50">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-6 text-red-500">
                      <Info className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">生成方案时遇到问题</h3>
                    <p className="text-slate-400 mb-8 max-w-xs text-sm leading-relaxed">{error}</p>
                    
                    <div className="flex flex-col gap-3 w-full max-w-[240px]">
                      {error.includes("权限") && (
                        <button
                          onClick={handleSelectKey}
                          className="w-full py-4 bg-black text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg"
                        >
                          重新选择 API Key
                        </button>
                      )}
                      <button
                        onClick={() => setError(null)}
                        className="w-full py-4 border border-slate-100 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors"
                      >
                        返回重试
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Performance Stats */}
            {(durations.resize || durations.ai || durations.total) && (
              <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-4 text-[10px] text-slate-400 font-mono bg-white/80 backdrop-blur-md p-3 rounded-xl border border-slate-100/50">
                {durations.resize && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    预处理: {(durations.resize / 1000).toFixed(2)}s
                  </div>
                )}
                {durations.ai && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    AI 渲染: {(durations.ai / 1000).toFixed(2)}s
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                  比例: {imageRatio}
                </div>
                {isGenerating && (
                  <div className="flex items-center gap-1.5 animate-pulse">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    计算中...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-12 flex flex-col items-center justify-center gap-4">
        <div className="text-[10px] font-bold tracking-[0.3em] text-slate-300 uppercase">
          POWERED BY {selectedModel.replace(/-/g, ' ')}
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}} />
    </div>
  );
}
