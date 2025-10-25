import { AnimatePresence, motion } from 'framer-motion';
import useStore from '../store.js';

export default function ClipModal() {
  const { selected, setSelected } = useStore();
  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 grid place-items-center p-4">
            <motion.div
              className="w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
            >
              {selected.href ? (
                <iframe
                  src={selected.href}
                  className="w-full h-full"
                  allow="autoplay; fullscreen"
                />
              ) : (
                <video src={selected.src} controls autoPlay className="w-full h-full" />
              )}
            </motion.div>
            <button
              className="mt-4 text-white/90 hover:text-white"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
