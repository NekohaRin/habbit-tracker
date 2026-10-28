import { useState } from 'react';
import WorkoutTab from './WorkoutTab';
import BodyTab from './BodyTab';

/** Layar "Workout & Body": tab Workout (M3) dan tab Body (M4). */
export default function WorkoutBody() {
  const [tab, setTab] = useState('workout');
  return (
    <main className="screen">
      <h1 className="display">Workout &amp; <em>Body</em></h1>
      <div className="segmented segmented-2" role="group" aria-label="Section">
        <button type="button" aria-pressed={tab === 'workout'} onClick={() => setTab('workout')}>Workout</button>
        <button type="button" aria-pressed={tab === 'body'} onClick={() => setTab('body')}>Body</button>
      </div>
      {tab === 'workout' ? (
        <WorkoutTab />
      ) : (
        <BodyTab />
      )}
    </main>
  );
}