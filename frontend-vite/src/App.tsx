import React, { Suspense, lazy, useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import CAPTIQLogo from './assets/CAPTIQ.png'

// --- IMPORTS FOR LIBS ---
import { useDropzone } from 'react-dropzone'
import toast, { Toaster } from 'react-hot-toast'
import { ClipLoader } from 'react-spinners'
import {
  FiUpload,
  FiDownload,
  FiSettings,
  FiVideo,
  FiEdit3,
  FiArrowDownCircle,
} from 'react-icons/fi'

// --- ADDED: CLERK IMPORTS ---
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

// --- LAZY LOAD THE 3D COMPONENT FOR PERFORMANCE ---
const Spline = lazy(() => import('@splinetool/react-spline'));

// --- Custom Hook to check for Desktop ---
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => {
      setMatches(media.matches);
    };
    
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// Types
type Language = 'en' | 'hi' | 'es' | 'fr' | 'de'
type Segment = { index: number; start: number; end: number; text: string }

// --- UTILITY FUNCTIONS ---
function secondsToTimestamp(seconds: number) {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000)
  const pad = (n: number, z = 2) => String(n).padStart(z, '0')
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`
}

function toSRT(segments: Segment[]) {
  const lines: string[] = []
  for (const s of segments) {
    lines.push(`${s.index}`)
    lines.push(`${secondsToTimestamp(s.start)} --> ${secondsToTimestamp(s.end)}`)
    lines.push(s.text)
    lines.push('')
  }
  return lines.join('\n')
}

function toPlainText(segments: Segment[]) {
  return segments.map(s => s.text).join('\n')
}

// --- APP COMPONENT ---
export default function App() {
  // --- STATE ---
  const [file, setFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>('en')
  const [task, setTask] = useState<'transcribe' | 'translate' | 'transliterate'>('transcribe')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [segments, setSegments] = useState<Segment[] | null>(null)

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const mainContentRef = useRef<HTMLElement | null>(null)

  // --- MEMOS ---
  const srtUrl = useMemo(() => {
    if (!segments) return null
    const blob = new Blob([toSRT(segments)], { type: 'text/plain' })
    return URL.createObjectURL(blob)
  }, [segments])

  const txtUrl = useMemo(() => {
    if (!segments) return null
    const blob = new Blob([toPlainText(segments)], { type: 'text/plain' })
    return URL.createObjectURL(blob)
  }, [segments])

  // --- HANDLERS ---
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      toast.error('File error: Please upload a single video file (MP4, MOV, AVI).')
      return
    }
    
    const f = acceptedFiles?.[0]
    if (f) {
      setSegments(null)
      setError(null)
      setFile(f)
      setVideoUrl(URL.createObjectURL(f))
      toast.success(`${f.name} selected!`)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
    },
    maxFiles: 1,
  })
  
  const onLanguageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language)
    setSegments(null)
    setError(null)
  }, [])

  const onTaskChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTask(e.target.value as 'transcribe' | 'translate' | 'transliterate')
    setSegments(null)
    setError(null)
  }, [])

  const onSubmit = useCallback(async () => {
    if (!file) {
      toast.error('Please select a file first.')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    setSegments(null)
    
    const processingToast = toast.loading('Generating your captions, please wait...')

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('language', language)
      form.append('task', task)
      
      const res = await fetch('https://destroyable-depreciatingly-lynetta.ngrok-free.dev/upload' , {
        method : 'POST' ,
        body : form ,
        headers : {
          'ngrok-skip-browser-warning' : 'true'
        }
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(errorData.detail || `HTTP ${res.status}`)
      }
      
      const data = await res.json()
      setSegments(data.segments)
      toast.success('Captions generated successfully!', { id: processingToast })

    } catch (err: any) {
      const errorMsg = err?.message || 'Something went wrong'
      setError(errorMsg)
      toast.error(errorMsg, { id: processingToast })
    } finally {
      setIsSubmitting(false)
    }
  }, [file, language, task])

  const handleScrollToMain = () => {
    mainContentRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // --- JSX RENDER ---
  return (
    <div className="relative w-full bg-[#11151C]">
      
      {/* --- Layer 1 - Conditionally rendered 3D Background --- */}
      <Suspense fallback={null}>
        {isDesktop && (
          <Spline
            scene="https://prod.spline.design/WUVeY0p6dGHKrDNG/scene.splinecode"
            className="fixed top-0 left-0 z-0 h-screen w-screen"
            style={{ 
              transform: 'scale(1.3) translateY(150px)', 
              transformOrigin: 'center' 
            }}
          />
        )}
      </Suspense>

      {/* --- Layer 2 - App Content --- */}
      <div className={`relative z-10 min-h-screen text-gray-200 ${isDesktop ? 'bg-transparent' : 'bg-[#11151C]'}`}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(33, 45, 64, 0.8)',
              backdropFilter: 'blur(10px)',
              color: '#e5e7eb',
              border: '1px solid rgba(55, 65, 81, 0.5)',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#FFFFFF' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' } },
          }}
        />
        
        {/* --- MODIFIED: Header with Clerk Auth --- */}
        <header className={`sticky top-0 z-20 border-b ${isDesktop ? 'border-gray-700/50 bg-[#212D40]/80 backdrop-blur-md' : 'border-gray-700 bg-[#212D40]'}`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
            {/* --- Existing Logo --- */}
            <h1 className="text-xl font-bold text-white">
              <span className="inline-flex items-center gap-0">
                <motion.img
                  src={CAPTIQLogo}
                  alt="CAPTIQ logo"
                  className="h-12 w-12 object-contain"
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.15 }}
                />
                <span className="-ml-1">CAPTIQ</span>
              </span>
            </h1>
            
            {/* --- ADDED: CLERK AUTH BUTTONS --- */}
            <div>
              <SignedOut>
                <SignInButton />
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
            {/* --- END: CLERK AUTH BUTTONS --- */}

          </div>
        </header>

        {/* Hero Section (Text-only) */}
          <section className="mx-auto max-w-3xl px-4 py-16 md:py-24">
           <motion.div
             initial={{ opacity: 0, x: -50 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.5 }}
             className="text-center"
           >
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              Instantly Transcribe Your Videos with AI
            </h1>
            <p className="mt-4 text-lg text-gray-300">
              Upload your video, and let our AI generate accurate, time-stamped
              captions in minutes. Transcribe, translate, and more.
            </p>
            <motion.button
              onClick={handleScrollToMain}
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-blue-700"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiArrowDownCircle />
              Get Started Now
            </motion.button>
          </motion.div>
        </section>

        {/* Main Content (ref for scrolling) */}
        <main ref={mainContentRef} className="mx-auto max-w-5xl p-4 md:grid md:grid-cols-3 md:gap-8 md:p-6 scroll-mt-20">
          
          {/* --- Controls Panel --- */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
            className={`h-fit rounded-lg p-6 shadow-xl md:col-span-1 ${isDesktop ? 'bg-[#212D40]/80 backdrop-blur-md' : 'bg-[#212D40]'}`}
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <FiSettings />
              Configuration
            </h2>
            <p className="mb-6 text-sm text-gray-400">
              Start by uploading your video. Select the desired task and source
              language, then click 'Generate' to begin.
            </p>

            {/* Dropzone */}
            <div className="mb-6">
              <div className="mb-2 text-sm font-medium text-gray-400">1. Upload File</div>
              <div
                {...getRootProps()}
                className={`flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-600 p-4 text-center text-gray-400 transition-colors hover:border-gray-500 ${
                  isDragActive ? 'border-blue-500 bg-blue-900/20' : ''
                }`}
              >
                <input {...getInputProps()} />
                <FiUpload className="mb-2 h-6 w-6" />
                {isDragActive ? (
                  <p>Drop the file here ...</p>
                ) : (
                  <p>Drag 'n' drop a video, or click to select</p>
                )}
              </div>
              {file && (
                <p className="mt-2 text-center text-sm text-green-400">
                  Selected: <strong>{file.name}</strong>
                </p>
              )}
              <p className="mt-1 text-center text-xs text-gray-500">Supports .mp4, .mov, .avi.</p>
            </div>

            {/* Task */}
            <div className="mb-6">
              <div className="mb-2 text-sm font-medium text-gray-400">2. Select Task</div>
              <div className="flex flex-col gap-2 text-sm">
                <label className="inline-flex items-center gap-2 text-gray-200">
                  <input
                    type="radio" name="task" value="transcribe" checked={task === 'transcribe'}
                    onChange={onTaskChange} className="h-4 w-4 accent-blue-600"
                  />
                  <span>Transcription <span className="text-gray-400">(Original Language)</span></span>
                </label>
                <label className="inline-flex items-center gap-2 text-gray-200">
                  <input
                    type="radio" name="task" value="translate" checked={task === 'translate'}
                    onChange={onTaskChange} className="h-4 w-4 accent-blue-600"
                  />
                  <span>Translation <span className="text-gray-400">(to English)</span></span>
                </label>
                <label className="inline-flex items-center gap-2 text-gray-200">
                  <input
                    type="radio" name="task" value="transliterate" checked={task === 'transliterate'}
                    onChange={onTaskChange} className="h-4 w-4 accent-blue-600"
                  />
                  <span>Transliteration <span className="text-gray-400">(e.g., नमस्ते {'>'} namaste)</span></span>
                </label>
              </div>
            </div>

            {/* Language Select */}
            <div className="mb-6">
              <div className="mb-2 text-sm font-medium text-gray-400">3. Select Language</div>
              <select
                value={language}
                onChange={onLanguageChange}
                className={`w-full rounded-md border p-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDesktop ? 'border-gray-600/50 bg-[#11151C]/80 backdrop-blur-sm' : 'border-gray-600 bg-[#11151C]'}`}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">The primary language spoken in your video.</p>
            </div>

            {/* Submit Button */}
            <div className="mt-8">
              <button
                onClick={onSubmit}
                disabled={!file || isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-lg transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <> <ClipLoader color="#ffffff" size={20} /> <span>Generating...</span> </>
                ) : (
                  <> <FiUpload /> <span>Generate Captions</span> </>
                )}
              </button>
            </div>
          </motion.div>

          {/* --- Results Area --- */}
          <motion.div
            className="mt-8 flex flex-col gap-8 md:col-span-2 md:mt-0"
          >
            {/* Video Preview */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
            >
              <div className={`rounded-lg p-6 shadow-xl ${isDesktop ? 'bg-[#212D40]/80 backdrop-blur-md' : 'bg-[#212D40]'}`}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <FiVideo /> Video Preview
                </h3>
              </div>
              {videoUrl ? (
                <video controls src={videoUrl} className="w-full rounded-lg" />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-md border-2 border-dashed border-gray-700 text-gray-500">
                  <p className="text-sm">Upload a video to see the preview.</p>
                </div>
              )}
              </div>
            </motion.div>

            {/* Transcript Editor */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.8 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
            >
              <div className={`rounded-lg p-6 shadow-xl ${isDesktop ? 'bg-[#212D40]/80 backdrop-blur-md' : 'bg-[#212D40]'}`}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <FiEdit3 /> Transcript Editor
                </h3>
                {segments && (
                  <div className="flex items-center gap-2">
                    {srtUrl && (
                      <a
                        href={srtUrl} download={`captions_${language}.srt`}
                        className="flex items-center gap-1 rounded-md border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700"
                      >
                        <FiDownload /> <span>.srt</span>
                      </a>
                    )}
                    {txtUrl && (
                      <a
                        href={txtUrl} download={`captions_${language}.txt`}
                        className="flex items-center gap-1 rounded-md border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700"
                      >
                        <FiDownload /> <span>.txt</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {!segments && (
                <div className="flex h-48 items-center justify-center rounded-md border-2 border-dashed border-gray-700">
                  <p className="text-center text-sm text-gray-500">
                    Your generated transcript will appear here.
                  </p>
                </div>
              )}

              {segments && (
                <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-2">
                  {segments.map(s => (
                    <div key={s.index} className="flex gap-4 rounded-lg p-3 hover:bg-[#11151C]/70">
                      <span className="w-28 shrink-0 font-mono text-sm text-blue-400">
                        {secondsToTimestamp(s.start)}
                      </span>
                      <span className="text-gray-200">{s.text}</span>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </motion.div>
          </motion.div>
        </main>

        {/* --- Footer --- */}
        <footer className={`p-4 md:p-8 lg:p-10 mt-16 border-t ${isDesktop ? 'border-gray-700/50 bg-[#212D40]/80 backdrop-blur-md' : 'border-gray-700 bg-[#212D40]'}`}>
          <div className="mx-auto max-w-screen-xl text-center">
            <motion.a
              href="#"
              className="flex justify-center items-center gap-0 text-2xl font-semibold text-gray-900 dark:text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <motion.img
                src={CAPTIQLogo}
                alt="CAPTIQ logo"
                className="h-12 w-12 object-contain"
                whileHover={{ scale: 1.08 }}
                transition={{ duration: 0.15 }}
              />
              <span className="-ml-1">CAPTIQ</span>
            </motion.a>
            <p className="my-6 text-gray-500 dark:text-gray-400">Accurate, AI-powered video captions in minutes. Built for developers and content creators.</p>
            <ul className="flex flex-wrap justify-center items-center mb-6 text-gray-900 dark:text-white">
              <li>
                <motion.a href="#" className="mr-4 hover:underline md:mr-6" whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>About</motion.a>
              </li>
              <li>
                <motion.a href="#" className="mr-4 hover:underline md:mr-6" whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>Pricing</motion.a>
              </li>
              <li>
                <motion.a href="#" className="mr-4 hover:underline md:mr-6" whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>Blog</motion.a>
              </li>
              <li>
                <motion.a href="#" className="mr-4 hover:underline md:mr-6" whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>FAQs</motion.a>
              </li>
              <li>
                <motion.a href="#" className="mr-4 hover:underline md:mr-6" whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>Contact</motion.a>
              </li>
            </ul>
            <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">© 2025 <motion.a href="#" className="hover:underline" whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>CAPTIQ™</motion.a>. All Rights Reserved.</span>
          </div>
        </footer>

        
      </div>
    </div>
  )
}