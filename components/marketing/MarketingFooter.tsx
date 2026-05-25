import Image from "next/image";
import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      ["For Teachers", "/for-teachers"],
      ["For Parents", "/for-parents"],
      ["For Schools", "/for-schools"],
      ["Sign In", "/login"],
      ["Start Free Trial", "/signup"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Blog", "/resources"],
      ["Affiliate Program", "/affiliate"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["FAQ", "/faq"],
      ["Privacy Policy", "/legal/privacy"],
      ["Terms of Service", "/legal/terms"],
      ["Data Request", "/data-request"],
    ],
  },
];

const socials = ["Facebook", "Instagram", "LinkedIn", "YouTube", "TikTok"];

export function MarketingFooter() {
  return (
    <footer className="bg-[#00001b] px-4 py-14 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/branding/sy-learning-icon-v6.png" alt="" width={42} height={42} className="h-11 w-11 rounded-xl" />
            <div>
              <p className="font-display text-xl font-black">Sý Learning</p>
              <p className="text-sm font-bold text-indigo-200">Together We Learn</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-6 text-indigo-100">
            Voice-first reading practice for striving readers, built for the teachers, tutors, and parents helping them grow.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-black uppercase tracking-wide text-indigo-200">{column.title}</h3>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-white/85">
              {column.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-white hover:underline">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-indigo-200">Social</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {socials.map((social) => (
              <a key={social} href="#" aria-label={social} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-black hover:bg-white/20">
                {social.slice(0, 1)}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-sm font-semibold text-indigo-200">
        © 2026 Sý Learning Corp. All rights reserved.
      </div>
    </footer>
  );
}
