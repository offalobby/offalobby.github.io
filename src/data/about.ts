/**
 * The facts on the About page. All of it comes from the resume (public/resume.pdf, Oct 2026);
 * edit freely. Your own words go in `bio`; journal entries live in
 * src/content/journal/.
 */
export const about = {
  /** PLACEHOLDER — a few sentences in your own voice. */
  bio: "Hellooo! My name is Afolabi. Please call me Afo - it's what my friends call me. \
   I'm currently an undergrad at Rice University, but you probably already knew that from the rest of the site haha. \
   I'm not one to bore others with the story of my life, but if you're interested in learning a little bit more about me \
   feel free to read some of my journal entries. Its not anything professional so please lower your expectations lol-- just some of my likes, dislikes... and maybe some random thoughts/commentaries.",
  education: {
    school: 'Rice University',
    degree: 'B.S. Electrical and Computer Engineering',
    expected: 'Expected May 2028',
  },
  honors: [
    'Sustaining Excellence in Research (SER) Scholar',
    'Rice Datathon 2026, 2nd place (Neuroscience Track)',
    'CyberPatriot State Finalist (3×)',
    'TSA Coding (3×) and Video Game Design (2×) State Finalist',
  ],
  leadership: [
    { role: 'Student Ambassador', org: 'Doerr Institute for New Leaders, Rice', when: '2024 – present' },
    { role: 'Ubuntu Team Lead', org: 'CyberPatriot', when: '2020 – 2024' },
    { role: 'Founder & Fundraiser Head', org: 'Junior Achievement (Bio-Bite, Petjoyz)', when: '2020 – 2024' },
  ],
  service: [
    'Partnership for the Advancement & Immersion of Refugees',
    'Betty and Jacob Friedman Holistic Garden',
    'Rice Pre-medical Society, Wiess College Representative',
    'Rice Moody Civic Immersion',
    'Houston Food Bank',
  ],
  affiliations: ['IEEE', 'Rice Data Science', 'Rice Pre-Medical Society', 'NSBE', 'Japanese American Citizens League'],
  languages: [
    { name: 'English', level: 'Native' },
    { name: 'Japanese', level: 'Limited working proficiency' },
    { name: 'Turkish', level: 'Elementary' },
  ],
  interests: ['Crocheting', 'Gardening', 'Healthcare technologies', 'Judo / grappling', 'Reading', 'Eating good food'],
  links: [
    { label: 'GitHub', href: 'https://github.com/offalobby' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/hirokidurodola' },
    { label: 'Email', href: 'mailto:ad207@rice.edu' },
    { label: 'Resume (PDF)', href: '/resume.pdf' },
  ],
};
