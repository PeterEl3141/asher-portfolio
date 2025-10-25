import { motion } from 'framer-motion';
import './Hero.css'

export default function Hero() {
  return (
    <section className="min-h-[30vh] flex flex-col items-center justify-center text-center py-12">
      <motion.h1
        className="text-4xl md:text-6xl font-bold tracking-tight"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Director • Filmmaker
      </motion.h1>
      <motion.p
        className="mt-4 max-w-xl text-neutral-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Selected works — hover to preview, click to watch.
      </motion.p>
    </section>
  );
}
