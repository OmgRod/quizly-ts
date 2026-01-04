import { QuizGenre } from '../types';

export const genreIcons: Record<QuizGenre, string> = {
  All: 'bi-grid',
  General: 'bi-app-indicator',
  Science: 'bi-flask',
  History: 'bi-bank',
  Technology: 'bi-cpu',
  'Pop Culture': 'bi-magic',
  Literature: 'bi-book-half',
  Music: 'bi-music-note-beamed',
  Movies: 'bi-film',
  Sports: 'bi-trophy',
  Geography: 'bi-globe-americas',
  Art: 'bi-brush',
  'Food & Drink': 'bi-egg-fried',
  Nature: 'bi-flower3',
  Mythology: 'bi-lightning',
  Politics: 'bi-megaphone',
  Business: 'bi-briefcase',
  Gaming: 'bi-controller'
};

export const getGenreIcon = (genre: QuizGenre) => genreIcons[genre] || 'bi-journal-richtext';
