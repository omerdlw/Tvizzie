'use client';

import { Suspense, use } from 'react';
import { motion } from 'framer-motion';
import PersonAwards from '@/domains/media/person/awards';
import PersonBio from '@/domains/media/person/bio';
import PersonFilmographySection from '@/domains/media/person/filmography-section';
import PersonGallery from '@/domains/media/person/gallery';
import NavHeightSpacer from '@/ui/components/nav-height-spacer';
import PersonTimeline from '@/domains/media/person/timeline';
import { PageGradientShell } from '@/ui/components/page-gradient-shell';
import { BlurryText } from '@/ui/motion/animations/blurry-text';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import { PersonSectionSkeleton, PersonTimelineSkeleton } from '@/domains/media/ui/person-skeleton';
import Registry from '@/domains/media/ui/media-registry';
import {
  personTitleVariants,
  personBioVariants,
  getSectionHeaderProps,
} from '@/domains/media/ui/media-animation-config';

function PersonMainContent({ person }) {
  return (
    <>
      {person?.images?.profiles?.length > 0 ? (
        <div className="mt-8 sm:mt-12">
          <PersonGallery images={person.images} />
        </div>
      ) : null}

      <div className="mt-8 sm:mt-12">
        <PersonFilmographySection person={person} />
      </div>
    </>
  );
}

function PersonDeferredContent({
  person,
  secondaryDataPromise,
  activeView,
}) {
  const secondaryPerson = use(secondaryDataPromise);
  const mergedPerson = {
    ...person,
    ...secondaryPerson,
  };
  if (activeView === 'timeline') {
    return (
      <motion.div
        className="mt-8 sm:mt-12"
        {...getSectionHeaderProps(0.15)}
      >
        <PersonTimeline person={mergedPerson} />
      </motion.div>
    );
  }
  return <PersonMainContent person={mergedPerson} />;
}

export default function PersonView({
  person,
  secondaryDataPromise,
  activeView,
  setActiveView,
  age,
  backgroundImage,
  onSetPersonPoster,
  onResetPersonPoster,
  canResetPersonPoster,
}) {
  if (!person) return null;
  const deferredFallback =
    activeView === 'timeline' ? (
      <PersonTimelineSkeleton className="mt-8 sm:mt-12" />
    ) : (
      <PersonSectionSkeleton className="mt-8 sm:mt-12" />
    );

  return (
    <>
      <Registry
        person={person}
        activeView={activeView}
        setActiveView={setActiveView}
        age={age}
        backgroundImage={backgroundImage}
        onSetPersonPoster={onSetPersonPoster}
        onResetPersonPoster={onResetPersonPoster}
        canResetPersonPoster={canResetPersonPoster}
      />

      <PageGradientShell>
        <div
          className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 px-3 pb-12 [overflow-anchor:none] sm:gap-8 sm:px-4 md:px-6`}
        >
          <div className="mt-16 flex w-full flex-col items-center gap-6 sm:mt-24 sm:gap-8 lg:mt-36">
            {activeView !== 'timeline' && activeView !== 'awards' && (
              <BlurryText
                as="h1"
                by="character"
                delay={0.10}
                duration={0.75}
                stagger={0.038}
                className="font-zuume mx-auto max-w-full text-5xl leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-7xl lg:text-8xl text-center"
              >
                {person.name}
              </BlurryText>
            )}

            {activeView !== 'timeline' && activeView !== 'awards' && person?.biography ? (
              <motion.div {...personBioVariants} className="mx-auto max-w-[72ch] w-full">
                <PersonBio biography={person.biography} person={person} />
              </motion.div>
            ) : null}

            <div className="w-full text-left" key={`person-view-${activeView}`}>
              {activeView === 'awards' ? (
                <motion.div
                  className="mt-8 sm:mt-12"
                  {...getSectionHeaderProps(0.15)}
                >
                  <PersonAwards personId={person.id} />
                </motion.div>
              ) : (
                <Suspense fallback={deferredFallback}>
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
        <NavHeightSpacer />
      </PageGradientShell>
    </>
  );
}
