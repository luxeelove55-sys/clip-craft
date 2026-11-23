import type { VideoProject, ViralClip } from '../types';

export const SAMPLE_VIDEO_PROJECT: VideoProject = {
  videoId: 'UF8uR6Z6KLc',
  url: 'https://www.youtube.com/watch?v=UF8uR6Z6KLc',
  title: "Steve Jobs' 2005 Stanford Commencement Address",
  author: 'Stanford',
  thumbnailUrl: 'https://i.ytimg.com/vi/UF8uR6Z6KLc/hqdefault.jpg',
  durationSeconds: 904,
  description:
    'Drawing from some of the most pivotal points in his life, Steve Jobs urges graduates to pursue their dreams and see the opportunities in life setbacks — including death itself.',
  hasRealTranscript: true,
  isSample: true,
  transcript: [
    { start: 72, duration: 12, text: 'Today I want to tell you three stories from my life. That is it. No big deal. Just three stories.' },
    { start: 86, duration: 14, text: 'The first story is about connecting the dots. I dropped out of Reed College after the first 6 months.' },
    { start: 195, duration: 15, text: 'I did not have a dorm room, so I slept on the floor in friends rooms, I returned Coke bottles for the 5 cent deposits.' },
    { start: 235, duration: 16, text: 'Reed College at that time offered perhaps the best calligraphy instruction in the country. I decided to take a calligraphy class.' },
    { start: 266, duration: 15, text: 'None of this had even a hope of any practical application in my life. But ten years later, when we were designing the first Macintosh computer, it all came back to me.' },
    { start: 295, duration: 18, text: 'You cannot connect the dots looking forward; you can only connect them looking backwards. So you have to trust that the dots will somehow connect in your future.' },
    { start: 332, duration: 16, text: 'My second story is about love and loss. I was lucky — I found what I loved to do early in life. Woz and I started Apple in my parents garage when I was 20.' },
    { start: 400, duration: 18, text: 'And then I got fired. How can you get fired from a company you started? What had been the focus of my entire adult life was gone, and it was devastating.' },
    { start: 455, duration: 18, text: 'I did not see it then, but it turned out that getting fired from Apple was the best thing that could have ever happened to me. The heaviness of being successful was replaced by the lightness of being a beginner again.' },
    { start: 515, duration: 18, text: 'Sometimes life hits you in the head with a brick. Do not lose faith. I am convinced that the only thing that kept me going was that I loved what I did.' },
    { start: 548, duration: 16, text: 'Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work. Keep looking. Do not settle.' },
    { start: 590, duration: 16, text: 'My third story is about death. When I was 17, I read a quote: If you live each day as if it was your last, someday you will most certainly be right.' },
    { start: 632, duration: 20, text: 'Remembering that I will be dead soon is the most important tool I have ever encountered to help me make the big choices in life.' },
    { start: 782, duration: 18, text: 'Your time is limited, so do not waste it living someone else life. Do not be trapped by dogma — which is living with the results of other people thinking.' },
    { start: 810, duration: 18, text: 'Have the courage to follow your heart and intuition. They somehow already know what you truly want to become. Everything else is secondary.' },
    { start: 865, duration: 18, text: 'Stay Hungry. Stay Foolish. And I have always wished that for myself. And now, as you graduate to begin anew, I wish that for you.' },
  ],
};

export const SAMPLE_VIRAL_CLIPS: ViralClip[] = [
  {
    id: 'sample-clip-1',
    title: 'You Can Only Connect the Dots Looking Backwards',
    viralScore: 95,
    startTime: 266,
    endTime: 312,
    reason:
      'Builds immediate curiosity from an unconventional calligraphy class into the iconic Macintosh payoff, ending on a universally shareable life philosophy.',
    hookLine: 'None of this had any practical application in my life...',
    captions: [
      { id: 'c1-1', startOffset: 0, endOffset: 5.5, text: 'None of this had even a hope' },
      { id: 'c1-2', startOffset: 5.5, endOffset: 11.5, text: 'of any practical application in my life.' },
      { id: 'c1-3', startOffset: 11.5, endOffset: 18, text: 'Ten years later, when designing the first Macintosh,' },
      { id: 'c1-4', startOffset: 18, endOffset: 24, text: 'it all came back to me — and we designed it into the Mac.' },
      { id: 'c1-5', startOffset: 24, endOffset: 32, text: 'You cannot connect the dots looking forward;' },
      { id: 'c1-6', startOffset: 32, endOffset: 39, text: 'you can only connect them looking backwards.' },
      { id: 'c1-7', startOffset: 39, endOffset: 46, text: 'Trust that the dots will somehow connect in your future.' },
    ],
  },
  {
    id: 'sample-clip-2',
    title: 'How Getting Fired from Apple Saved Everything',
    viralScore: 93,
    startTime: 400,
    endTime: 452,
    reason:
      'Opens with a counter-intuitive contradiction ("fired from a company I started") that creates high tension and resolves in a powerful mindset reframe.',
    hookLine: 'How can you get fired from a company you started?',
    captions: [
      { id: 'c2-1', startOffset: 0, endOffset: 6, text: 'How can you get fired from a company you started?' },
      { id: 'c2-2', startOffset: 6, endOffset: 13, text: 'The focus of my entire adult life was gone.' },
      { id: 'c2-3', startOffset: 13, endOffset: 20, text: 'And it was devastating for a few months.' },
      { id: 'c2-4', startOffset: 20, endOffset: 29, text: 'Getting fired from Apple was the best thing that ever happened to me.' },
      { id: 'c2-5', startOffset: 29, endOffset: 38, text: 'The heaviness of being successful was replaced' },
      { id: 'c2-6', startOffset: 38, endOffset: 46, text: 'by the lightness of being a beginner again.' },
      { id: 'c2-7', startOffset: 46, endOffset: 52, text: 'It freed me to enter one of the most creative periods of my life.' },
    ],
  },
  {
    id: 'sample-clip-3',
    title: 'Your Time Is Limited — Do Not Live Someone Else’s Life',
    viralScore: 91,
    startTime: 780,
    endTime: 824,
    reason:
      'High-conviction direct address that resonates across career, entrepreneurship, and personal growth niches—ideal for high save and repost rates.',
    hookLine: 'Your time is limited, so do not waste it...',
    captions: [
      { id: 'c3-1', startOffset: 0, endOffset: 6.5, text: 'Your time is limited, so do not waste it' },
      { id: 'c3-2', startOffset: 6.5, endOffset: 12, text: 'living someone else’s life.' },
      { id: 'c3-3', startOffset: 12, endOffset: 20, text: 'Do not be trapped by dogma — living with other people’s thinking.' },
      { id: 'c3-4', startOffset: 20, endOffset: 29, text: 'Have the courage to follow your heart and intuition.' },
      { id: 'c3-5', startOffset: 29, endOffset: 37, text: 'They somehow already know what you truly want to become.' },
      { id: 'c3-6', startOffset: 37, endOffset: 44, text: 'Everything else is secondary.' },
    ],
  },
  {
    id: 'sample-clip-4',
    title: 'Sometimes Life Hits You in the Head With a Brick',
    viralScore: 88,
    startTime: 515,
    endTime: 558,
    reason:
      'Punchy metaphor at second 1 grabs scroll-stop attention, followed by practical advice on finding meaningful work without settling.',
    hookLine: 'Sometimes life hits you in the head with a brick.',
    captions: [
      { id: 'c4-1', startOffset: 0, endOffset: 6, text: 'Sometimes life hits you in the head with a brick.' },
      { id: 'c4-2', startOffset: 6, endOffset: 11, text: 'Do not lose faith.' },
      { id: 'c4-3', startOffset: 11, endOffset: 19, text: 'The only thing that kept me going was that I loved what I did.' },
      { id: 'c4-4', startOffset: 19, endOffset: 27, text: 'The only way to do great work is to love what you do.' },
      { id: 'c4-5', startOffset: 27, endOffset: 36, text: 'If you have not found it yet, keep looking.' },
      { id: 'c4-6', startOffset: 36, endOffset: 43, text: 'Do not settle.' },
    ],
  },
];
