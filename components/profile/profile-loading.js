import Icon from '@/ui/icon'

export default function ProfileLoading() {
  return (
    <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 p-3 sm:p-4 md:p-6">
      <section className="flex min-h-[320px] items-center justify-center rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-sm text-white/50">
          <Icon icon="solar:spinner-bold" size={18} className="animate-spin" />
          Loading profile...
        </div>
      </section>
    </div>
  )
}
