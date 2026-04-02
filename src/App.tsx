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
import { GoogleGenAI } from "@google/genai";
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
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded pointer-events-none">
        毛坯原图
      </div>
      <div className="absolute bottom-4 right-4 bg-indigo-600/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded pointer-events-none">
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
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        setHasApiKey(true);
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
          if (ratio > 1.5) {
            setImageRatio("16:9");
          } else if (ratio > 1.2) {
            setImageRatio("4:3");
          } else if (ratio > 0.8) {
            setImageRatio("1:1");
          } else if (ratio > 0.6) {
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

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
          const generatePromise = ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
                { text: prompt }
              ]
            },
            config: {
              systemInstruction: "You are a professional interior designer specializing in image-to-image room transformation. STRICT RULE: NO STRUCTURAL CHANGES. SURFACE OVERLAY ONLY. PRESERVE ALL ORIGINAL WALLS, WINDOWS, DOORS, AND CEILING POSITIONS. ONLY CHANGE TEXTURES, COLORS, AND ADD FURNITURE. DO NOT ALTER THE PHYSICAL ARCHITECTURE OF THE ROOM. MAINTAIN THE ORIGINAL PERSPECTIVE.",
              imageConfig: {
                aspectRatio: imageRatio
              }
            }
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
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col md:flex-row font-sans text-[#1a1a1a]">
      {/* Sidebar */}
      <aside className="w-full md:w-[380px] bg-[#f5f5f5] flex flex-col h-screen sticky top-0 p-8">
        {/* SaaS User Info */}
        {saasUser && (
          <div className="mb-8 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                {saasUser.name[0]}
              </div>
              <div>
                <div className="font-bold text-slate-900">{saasUser.name}</div>
                <div className="text-xs text-slate-400">{saasUser.enterprise}</div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
              <span className="text-sm text-slate-500">剩余积分</span>
              <span className="font-mono font-bold text-indigo-600">{saasUser.integral}</span>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-500 mb-6">1. 选择装修风格</h2>
          
          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[calc(100vh-280px)]">
            {STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style)}
                className={cn(
                  "w-full text-left p-5 rounded-2xl transition-all duration-200 bg-white shadow-sm",
                  selectedStyle.id === style.id 
                    ? "ring-2 ring-black shadow-md" 
                    : "hover:shadow-md border-transparent"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "font-bold text-lg",
                    selectedStyle.id === style.id ? "text-black" : "text-slate-700"
                  )}>
                    {style.name}
                  </span>
                  {selectedStyle.id === style.id && (
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {style.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-200">
          <button
            onClick={handleGenerate}
            disabled={!originalImage || isGenerating}
            className={cn(
              "w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-lg",
              !originalImage || isGenerating
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-black text-white hover:bg-slate-800 active:scale-95"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                立即生成装修方案
              </>
            )}
          </button>
          
          {!hasApiKey && hasApiKey !== null && (
            <button
              onClick={handleSelectKey}
              className="w-full mt-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              重新选择 API Key
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 flex items-center justify-center bg-white md:rounded-l-[40px] shadow-2xl overflow-hidden min-h-screen">
        <div className={cn(
          "relative group transition-all duration-500 ease-in-out",
          imageRatio === "16:9" ? "aspect-[16/9] w-full max-w-5xl" : 
          imageRatio === "4:3" ? "aspect-[4/3] w-full max-w-4xl" :
          imageRatio === "1:1" ? "aspect-square h-[70vh]" :
          imageRatio === "3:4" ? "aspect-[3/4] h-[80vh]" : "aspect-[9/16] h-[85vh]"
        )}>
          {!originalImage ? (
            <div 
              {...getRootProps()} 
              className={cn(
                "w-full h-full border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center transition-all duration-300 cursor-pointer",
                isDragActive ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
              )}
            >
              <input {...getInputProps()} />
              <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">上传毛坯房照片</h3>
              <p className="text-slate-400 text-lg">支持 JPG, PNG 格式，建议光线充足</p>
            </div>
          ) : (
            <div className="w-full h-full rounded-[32px] overflow-hidden shadow-2xl bg-slate-100">
              {generatedImage ? (
                <div className="w-full h-full relative">
                  <BeforeAfterSlider before={originalImage} after={generatedImage} />
                  
                  <div className="absolute top-8 right-8 flex gap-3">
                    <button 
                      onClick={handleDownload}
                      className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-xl hover:bg-white transition-all active:scale-95 text-slate-900 flex items-center gap-2 font-bold"
                    >
                      <Download className="w-5 h-5" />
                      下载方案
                    </button>
                    <button 
                      onClick={() => {
                        setOriginalImage(null);
                        setGeneratedImage(null);
                      }}
                      className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-xl hover:bg-white transition-all active:scale-95 text-slate-600"
                    >
                      <RefreshCw className="w-5 h-5" />
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 backdrop-blur-sm">
                      <div className="relative">
                        <div className="w-24 h-24 border-4 border-white/20 border-t-white rounded-full animate-spin mb-8"></div>
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white animate-pulse" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-lg">
                        {loadingMessage}
                      </h3>
                      <p className="text-white/80 text-lg animate-pulse">预计需要 30-60 秒，请耐心等待...</p>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/90 backdrop-blur-sm px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                        <ImageIcon className="w-6 h-6 text-indigo-600" />
                        <p className="font-bold text-slate-900">
                          已准备就绪，请点击左侧按钮生成
                        </p>
                      </div>
                      <button 
                        onClick={() => setOriginalImage(null)}
                        className="absolute top-8 right-8 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white transition-colors text-slate-600"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-md p-10 flex flex-col items-center justify-center text-center z-50">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600">
                    <Info className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">生成方案时遇到问题</h3>
                  <p className="text-slate-500 mb-10 max-w-md leading-relaxed">{error}</p>
                  
                  <div className="flex flex-col gap-4 w-full max-w-xs">
                    {error.includes("权限") && (
                      <button
                        onClick={handleSelectKey}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg"
                      >
                        重新选择 API Key
                      </button>
                    )}
                    <button
                      onClick={() => setError(null)}
                      className="w-full py-4 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-colors"
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
            <div className="mt-6 flex flex-wrap gap-6 text-xs text-slate-400 font-mono bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {durations.resize && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  图片预处理: {(durations.resize / 1000).toFixed(2)}s
                </div>
              )}
              {durations.ai && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  AI 渲染耗时: {(durations.ai / 1000).toFixed(2)}s
                </div>
              )}
              {durations.total && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  总计耗时: {(durations.total / 1000).toFixed(2)}s
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                检测比例: {imageRatio} ({imageRatio.split(':')[0] > imageRatio.split(':')[1] ? '横屏' : imageRatio === '1:1' ? '正方形' : '竖屏'})
              </div>
              {isGenerating && (
                <div className="flex items-center gap-2 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  正在计算中...
                </div>
              )}
            </div>
          )}
        </div>
      </main>

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
