import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className={styles.navbar}>
      <NavLink to="/" className={styles.brand}>
        Gateway Test Console
      </NavLink>

      {/* 햄버거 (모바일) */}
      <button
        className={styles.hamburger}
        aria-label="메뉴 열기"
        onClick={() => setMenuOpen(o => !o)}
      >
        <span /><span /><span />
      </button>

      <div className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          onClick={() => setMenuOpen(false)}
        >
          서비스 제어 패널
        </NavLink>
        <NavLink
          to="/stress"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          onClick={() => setMenuOpen(false)}
        >
          부하 테스트
        </NavLink>
      </div>
    </nav>
  );
}
