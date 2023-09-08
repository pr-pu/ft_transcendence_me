'use client'

import Link from 'next/link';
import { useState } from 'react';
import styles from '../styles/navbar.module.css';

export enum NavBarPos {
  chat,
  game,
  profile,
}

// sessionStorage, localStorage to store status
// export default function NavBar({ status }: { status: NavBarPos }) {
export default function NavBar() {
  const [state, setState] = useState(NavBarPos.profile);
  const navBtn: string[] = ["chat", "game", "profile"];

  function updateState(e: any) {
    // other option instead of indexOf and textContent?
    const state: NavBarPos = navBtn.indexOf(e.target.textContent);
    setState(state);
  }

  return (
    <div className={styles.navbar} onClick={updateState}>
      {navBtn.map((name: string) => {
	return (
	  <Link
	    key={name}
	    id={`#${name}NavBtn`}
	    className={`${styles.button} ${navBtn[state] === name ? styles.current : styles.rest}`}
	    href={`/content/${name}`}>{name}
	  </Link>
	);
      })}
   </div>
  );
}
