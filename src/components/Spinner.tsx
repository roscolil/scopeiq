export const Spinner = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <div className="absolute inset-4 rounded-full border-4 border-secondary border-b-transparent animate-spin-slow"></div>
        <div className="absolute inset-8 rounded-full bg-primary/20 animate-pulse"></div>
        <span className="absolute inset-0 flex items-center justify-center text-primary font-bold text-xl">
          IQ
        </span>
      </div>
    </div>
  )
}
