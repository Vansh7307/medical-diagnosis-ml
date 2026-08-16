import { motion, type HTMLMotionProps } from 'framer-motion'

export default function MotionReveal(props: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      {...props}
    />
  )
}
