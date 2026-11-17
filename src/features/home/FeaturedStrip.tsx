import { Link } from 'react-router'
import { Polaroid } from '@/components/shared/Polaroid'
import { useFeaturedMemories } from '@/features/memories/hooks'

/** "Our favorite moments": featured memories on Home (CR-03, FR-MEM-08). */
export function FeaturedStrip() {
  const featured = useFeaturedMemories()
  if (!featured.data || featured.data.length === 0) return null

  return (
    <section aria-labelledby="featured-heading" className="flex flex-col gap-3">
      <h2 id="featured-heading" className="font-sans text-micro font-bold uppercase tracking-[0.06em] text-ink-soft">
        Our favorite moments
      </h2>
      <ul className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 pt-2 [scrollbar-width:none]">
        {featured.data.map((memory) => (
          <li key={memory.id} className="w-40 shrink-0 snap-start sm:w-48">
            <Link to={`/memories/${memory.id}`} viewTransition aria-label={memory.caption || 'Featured memory'} className="block transition-transform active:scale-[0.97]">
              <Polaroid path={memory.photo_path} alt={memory.caption || 'Featured memory'} caption={memory.caption || undefined} tiltSeed={memory.id} transitionName={`memory-${memory.id}`} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
