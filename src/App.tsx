import Storefront from './pages/Storefront';
import Admin from './pages/Admin';
export default function App() { return location.pathname.startsWith('/admin') ? <Admin/> : <Storefront/>; }
