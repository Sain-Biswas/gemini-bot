import { motion } from "framer-motion";
import Link from "next/link";


export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-[500px] mt-20 mx-4 md:mx-0"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="border-none bg-muted/50 rounded-2xl p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700">

        <p className="text-zinc-700 dark:text-zinc-200 text-center font-medium">
          Welcome to <span className="text-blue-500 dark:text-blue-400">Karma Sathi</span>
        </p>

        <p>
          <strong>Karma Sathi</strong> is an AI-powered assistant designed to help
          workers in India’s informal sector identify and safely report cases of
          workplace exploitation, harassment, unpaid wages, and other labour
          rights violations.
        </p>

        <p>
          It helps users:
          <br />– Understand their situation clearly  
          <br />– Learn about verified government and NGO resources  
          <br />– Get state-wise helpline numbers and reporting options  
          <br />– Know what documents they’ll need and what to expect next  
        </p>

        <p>
          This project is open source and built with{" "}
          <Link
            href="https://nextjs.org/"
            className="text-blue-500 dark:text-blue-400"
            target="_blank"
          >
            Next.js
          </Link>
          ,{" "}
          <Link
            href="https://sdk.vercel.ai/docs"
            className="text-blue-500 dark:text-blue-400"
            target="_blank"
          >
            the Vercel AI SDK
          </Link>
          , and{" "}
          <Link
            href="https://www.framer.com/motion/"
            className="text-blue-500 dark:text-blue-400"
            target="_blank"
          >
            Framer Motion
          </Link>{" "}
          for a smooth, responsive chat experience.
        </p>

        <p>
          Karma Sathi empowers workers through knowledge, not confrontation —
          offering guidance, safety, and dignity.
        </p>

        <p className="text-center text-zinc-600 dark:text-zinc-400 mt-2 text-xs">
          Built with ❤️ for India’s workers. Open source on{" "}
          <Link
            href="https://github.com"
            target="_blank"
            className="text-blue-500 dark:text-blue-400"
          >
            GitHub
          </Link>
          .
        </p>
      </div>
    </motion.div>
  );
};
