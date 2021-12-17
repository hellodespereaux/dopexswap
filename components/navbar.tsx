import styles from '../styles/navbar.module.css'

export const Navbar = () => (
  <div className="sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-500 lg:z-50 lg:border-b lg:border-gray-900/10 bg-black/95 supports-backdrop-blur:bg-black/60 bottom-gradient">
    <div className="max-w-8xl mx-auto">
      <div className="py-4 border-b border-gray-900/10 lg:px-8 lg:border-0 mx-4 lg:mx-0">
        <div className="relative flex items-center">
          <div
            className="mr-3 flex-none w-[2.0625rem] overflow-hidden md:w-auto"
          >
            <img src={'images/logo.svg'} className={'w-8'}/>
          </div>
          <div
            className="ml-3 text-xs leading-5 text-sky-600 bg-sky-400/10 rounded-full py-1 px-3 hidden xl:flex items-center hover:bg-sky-400/20"
          >
            <strong className="font-semibold">Hello anon!</strong>
            <svg
              width={2}
              height={2}
              fill="currentColor"
              aria-hidden="true"
              className="ml-2"
            >
              <circle cx={1} cy={1} r={1} />
            </svg>
            <span className="ml-2">
              Swap your dumb coins for the good blue coin which rules everything
            </span>
          </div>
          <nav className="hidden lg:block ml-auto">
            <ul className="flex space-x-8 text-sm leading-6 font-semibold text-gray-400">
              <li>
                <a href="https://app.dopex.io/ssov" target={'_blank'} className="hover:text-white" >
                  SSOV
                </a>
              </li>
              <li>
                <a href="https://app.dopex.io/farms" target={'_blank'} className="hover:text-white">
                  Farms
                </a>
              </li>
              <li>
                <a href="https://docs.dopex.io/" target={'_blank'} className="hover:text-white">
                  Docs
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
    <div className={styles.nav_gradient_container}>
      <div className={styles.nav_gradient_line}></div>
    </div>
  </div>
);
