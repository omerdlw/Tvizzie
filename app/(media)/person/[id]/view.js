import { Suspense, use } from 'react'

import PersonAwards from '@/features/person/awards'
import FilmographyCard from '@/features/person/filmography-card'
import PersonGallery from '@/features/person/gallery'
import PersonSidebar from '@/features/person/sidebar'
import PersonTimeline from '@/features/person/timeline'
import { PageGradientShell } from '@/features/layout/page-gradient-backdrop'
import { getFilmographyCredits } from '@/features/person/utils'
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants'
import { FadeLeft, FadeUp, RevealItem } from '@/ui/animations'
import Icon from '@/ui/icon'
import Registry from './registry'

function DeferredContentFallback() {
  return (
    <div className="flex h-40 items-center justify-center">
      <Icon
        icon="solar:spinner-bold"
        size={24}
        className="animate-spin text-white"
      />
    </div>
  )
}

function PersonMainContent({ person }) {
  const movieCredits = getFilmographyCredits(person, 'movie')

  return (
    <>
      <FadeUp>
        <PersonGallery images={person.images} />
      </FadeUp>
      {movieCredits.length > 0 ? (
        <FadeUp className="mt-10 flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">
            Filmography
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {movieCredits.map((credit, index) => (
              <RevealItem
                key={`${credit.media_type}-${credit.id}-${credit.credit_id}`}
                delay={Math.min(index, 7) * 0.04}
                distance={12}
                duration={0.45}
                scale={0.992}
              >
                <FilmographyCard
                  credit={credit}
                  imagePriority={index < 8}
                  imageFetchPriority={index < 8 ? 'high' : undefined}
                />
              </RevealItem>
            ))}
          </div>
        </FadeUp>
      ) : null}
    </>
  )
}

function PersonDeferredContent({
  person,
  secondaryDataPromise,
  activeView,
}) {
  const secondaryPerson = use(secondaryDataPromise)
  const mergedPerson = {
    ...person,
    ...secondaryPerson,
  }

  if (activeView === 'timeline') {
    return <PersonTimeline person={mergedPerson} />
  }

  return <PersonMainContent person={mergedPerson} />
}

export default function PersonView({
  person,
  secondaryDataPromise,
  activeView,
  setActiveView,
  age,
  backgroundImage,
}) {
  if (!person) return null

  return (
    <>
      <Registry
        person={person}
        activeView={activeView}
        setActiveView={setActiveView}
        age={age}
        backgroundImage={backgroundImage}
      />

      <PageGradientShell>
        <div
          className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-8 px-3 pb-12 [overflow-anchor:none] sm:px-4 md:px-6`}
        >
          <div className="relative z-10 mt-8 flex w-full flex-col items-start gap-6 sm:mt-12 lg:mt-20 lg:flex-row lg:gap-12">
            <div className="w-full shrink-0 self-start lg:sticky lg:top-6 lg:w-[400px]">
              <FadeLeft>
                <PersonSidebar person={person} age={age} />
              </FadeLeft>
            </div>

            <div className="flex w-full min-w-0 flex-col">
              <div className="flex w-full flex-col">
                <FadeUp delay={0.05}>
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-3">
                      <h1 className="font-zuume text-7xl font-bold uppercase sm:text-8xl">
                        {person.name}
                      </h1>
                    </div>
                  </div>
                </FadeUp>

                <div className="relative mt-4 flex w-full flex-col">
                  {activeView === 'awards' ? (
                    <PersonAwards personId={person.id} />
                  ) : (
                    <Suspense fallback={<DeferredContentFallback />}>
                      <PersonDeferredContent
                        person={person}
                        secondaryDataPromise={secondaryDataPromise}
                        activeView={activeView}
                      />
                    </Suspense>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageGradientShell>
    </>
  )
}
