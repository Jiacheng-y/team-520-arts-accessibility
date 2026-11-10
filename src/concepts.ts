import type {Variant} from './experiment';
export const concepts: Record<Variant, {
  image: string; alt: string; productImage: string; productAlt: string; lede: string; title: string; description: string;
  steps: {title: string; text: string}[]; equipment: string; pilot: string;
}> = {
  worksheet: {
    image: 'worksheet.png',
    productImage: 'worksheet-product.png',
    productAlt: 'Printed Cypress Clue worksheet on a clipboard, with a pencil and headphones for the audio guide.',
    alt: 'Visitors examining The Starry Night and recording discoveries on printed clue worksheets.',
    lede: 'Turn a museum visit into a discovery worth sharing. A printed worksheet and audio guide invite you to listen, look closely, and follow clues in the art.',
    title: 'Listen. Look. Discover.',
    description: 'An audio prompt. A detail to find. A discovery to write down. Explore the gallery with a worksheet and audio guide that bring attention back to the art.',
    steps: [
      {title: 'Pick up your worksheet', text: 'Begin with a printed trail of clues and space to record what catches your eye.'},
      {title: 'Listen and look closer', text: 'Follow the audio guide to a real painting. Listen to its story and find the details in front of you.'},
      {title: 'Capture your discoveries', text: 'Write or sketch your answers. Compare what you noticed and share your discoveries together.'},
    ],
    equipment: 'The concept pairs printed worksheets and pencils with an audio guide. Audio playback, headphones, shared use, and accessibility needs would be planned with each museum before a pilot.',
    pilot: 'Explore a printed worksheet and audio guide built around a few artworks and a school-group visit.',
  },
  mobile: {
    image: 'mobile.png',
    productImage: 'mobile-product.png',
    productAlt: 'Mobile phone showing The Cypress Clue role-playing challenge, with artwork details and multiple-choice answers.',
    alt: 'Visitors playing a museum role-playing adventure on their mobile phones in front of The Starry Night.',
    lede: 'Turn a museum visit into a story worth following. A role-playing adventure on your mobile phone starts with a character—and brings you back to the art.',
    title: 'Play a part. Look closer.',
    description: 'A missing detail. An unexpected discovery. A choice that changes the story. Follow a role-playing adventure on your mobile phone, with the next clue on the gallery wall.',
    steps: [
      {title: 'Step into a role', text: 'Start on your mobile phone. Become a detective, collector, artist, or character from the past.'},
      {title: 'Let the art lead you', text: 'Find the real painting. Notice the small details. Use what you see to uncover the next clue on your phone.'},
      {title: 'Make the story yours', text: 'Choose what happens next in the mobile adventure. Compare discoveries and leave with a new way of looking.'},
    ],
    equipment: 'The concept runs on visitors’ mobile phones. Device access, connectivity, shared use, and accessibility needs would be explored with each museum before a pilot.',
    pilot: 'Explore a mobile-phone role-playing adventure built around a few artworks and a school-group visit.',
  },
  device: {
    image: 'device.png',
    productImage: 'device-product.png',
    productAlt: 'Dedicated museum role-playing device showing The Cypress Clue, with three physical buttons, wired earphones, and a wrist strap.',
    alt: 'Visitors playing a museum role-playing adventure on dedicated handheld devices with buttons and headphones in front of The Starry Night.',
    lede: 'Turn a museum visit into a story worth following. A role-playing adventure on a dedicated handheld device starts with a character—and brings you back to the art.',
    title: 'Play a part. Look closer.',
    description: 'A missing detail. An unexpected discovery. A choice that changes the story. Follow a role-playing adventure on a dedicated handheld device, with the next clue on the gallery wall.',
    steps: [
      {title: 'Step into a role', text: 'Pick up a dedicated handheld device at the museum. Become a detective, collector, artist, or character from the past.'},
      {title: 'Let the art lead you', text: 'Find the real painting. Follow prompts on the device and use its buttons to respond to clues in the artwork.'},
      {title: 'Make the story yours', text: 'Choose what happens next in the handheld adventure. Compare discoveries and return the device after your visit.'},
    ],
    equipment: 'The concept uses dedicated handheld devices provided by the museum. Device supply, charging, cleaning, headphones, and accessibility needs would be planned with each museum before a pilot.',
    pilot: 'Explore a role-playing adventure on dedicated handheld devices, built around a few artworks and a school-group visit.',
  },
};
