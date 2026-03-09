import { Link } from 'react-router-dom'

export function ApologoiPage() {
	return (
		<main className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
			<section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
				<div className="border-b border-slate-700 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 p-4 md:p-6">
				<div className="flex items-center justify-between">
					<Link to="/odyssey" className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300 hover:text-cyan-200">
						Odyssey Lore
					</Link>
					<Link
						to="/"
						className="rounded border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:border-slate-500"
					>
						Home
					</Link>
				</div>
					<h1 className="mt-2 text-3xl font-bold text-cyan-100 md:text-4xl">What Are the Apologoi?</h1>
					<p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
						The thrilling storytelling core of Homer&apos;s Odyssey, where Odysseus recounts monsters, gods, and hard lessons from the sea.
					</p>
				</div>

				<div className="p-4 md:p-6">
					<img
						src="/assets/odyssey/apologoi-hero.jpg"
						alt="Odysseus recounting his sea trials before the Phaeacian court"
						className="h-auto w-full rounded-lg border border-slate-700 object-cover"
					/>
				</div>
			</section>

			<article className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-slate-200 md:p-6">
				<p>
					The Apologoi, often translated as "the tales" or "narratives," form the thrilling core of Homer&apos;s <em>Odyssey</em>, spanning Books 9 through 12. Picture this: Odysseus, the weary king of Ithaca, washes ashore on the island of Scheria, home to the hospitable Phaeacians. Exhausted from years of wandering after the Trojan War, he finds himself at a royal feast hosted by King Alcinous. As the evening unfolds, Odysseus, disguised as a beggar, reveals his identity and begins recounting his extraordinary adventures. These stories, shared over wine and music, captivate his hosts and pull us into a whirlwind of monsters, gods, and human folly. It&apos;s like the ultimate campfire yarn, where one man&apos;s survival becomes an epic saga for the ages.
				</p>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold text-cyan-100">Why These Tales Are the Heart of the Epic</h2>
					<p>
						At its essence, the <em>Odyssey</em> is a poem about homecoming, but the Apologoi inject the excitement that makes it unforgettable. They shift the narrative from third-person epic to Odysseus&apos; own voice, turning him from a distant hero into a relatable storyteller.
					</p>
					<p>
						Why are they central? First, they showcase Odysseus&apos; cleverness, his "metis," or cunning intelligence, that helps him outwit dangers like the Cyclops or the Sirens. Second, they explore timeless themes: the perils of curiosity (opening Aeolus&apos; wind bag), the cost of hubris (taunting Polyphemus), and the pull of temptation (the Lotus-Eaters&apos; forgetfulness). Finally, these tales humanize the gods, Poseidon&apos;s vengeful storms and Circe&apos;s enchanting spells, reminding us that even immortals play favorites in the mortal world. Without the Apologoi, the <em>Odyssey</em> would be a straightforward journey; with them, it&apos;s a rollercoaster of wonder and warning.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold text-cyan-100">Key Elements of the Apologoi</h2>
					<ul className="list-disc space-y-1 pl-5 text-slate-300">
						<li>
							<strong>Storytelling Frame:</strong> Odysseus narrates to the Phaeacians, who listen raptly, much like ancient audiences around a bard. This meta-layer adds intimacy, as if we&apos;re eavesdropping on history.
						</li>
						<li>
							<strong>Adventures Unfolded:</strong> From the forgetful bliss of the Lotus-Eaters to the gruesome escape from Polyphemus&apos; cave, each episode builds suspense. Highlights include the winds of Aeolus gone awry, the giant cannibals of Laestrygonia, Circe&apos;s animal transformations, and the eerie descent to the Underworld for Tiresias&apos; prophecies.
						</li>
						<li>
							<strong>Themes in Action:</strong> Hospitality (or its violation) runs deep, good hosts like the Phaeacians aid heroes, while bad ones (like the Cyclops) devour them. The stories also warn against excess: greed, pride, or indulgence often leads to disaster.
						</li>
					</ul>
				</section>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold text-cyan-100">Fun Fact</h2>
					<p>
						The Apologoi have inspired countless retellings, from James Joyce&apos;s <em>Ulysses</em> to Disney&apos;s <em>Hercules</em>. They&apos;re not just ancient lore; they&apos;re blueprints for modern adventure tales, think Indiana Jones dodging traps or Harry Potter consulting ghosts.
					</p>
				</section>

				<p>
					In <em>Dice Odyssey</em>, these tales come alive through AI opponents like Poly (the brute Cyclops) or Circe (the enchanting transformer), letting you roll the dice in your own epic duels. Dive into the game to outwit myths reborn.
				</p>

				<div className="flex justify-end gap-2 pt-2">
					<Link
						to="/odyssey/lotus-eaters"
						className="rounded border border-cyan-500/70 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400"
					>
						Next: Lotus-Eaters
					</Link>
				</div>
			</article>
		</main>
	)
}
