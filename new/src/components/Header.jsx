
import React, { useState } from 'react';
import { LogOut, Briefcase, UserCircle, Loader2, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ user, onLogout, isSalesMember }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    await onLogout();
  };

  const navLinks = isSalesMember ? [
    { name: 'Dashboard', path: '/sales-dashboard' },
    { name: 'Prospectos', path: '/prospects' },
    { name: 'Clientes', path: '/clients' }
  ] : [
    { name: 'Dashboard', path: '/admin' },
    { name: 'Prospectos', path: '/admin/prospects' },
    { name: 'Clientes', path: '/admin/clients' }
  ];

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className="bg-white shadow-md sticky top-0 z-50"
    >
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          {isSalesMember ? (
             <UserCircle className="h-8 w-8 text-blue-600 mr-3" />
          ) : (
             <Briefcase className="h-8 w-8 text-green-600 mr-3" />
          )}
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 mr-8">
            {isSalesMember ? "Sales Portal" : "Commercial Admin"}
          </h1>
          
          <nav className="hidden md:flex space-x-1">
             {navLinks.map(link => (
               <Link key={link.path} to={link.path}>
                 <Button variant={location.pathname === link.path ? "secondary" : "ghost"} size="sm" className="font-medium">
                   {link.name}
                 </Button>
               </Link>
             ))}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {user && (
            <div className="flex items-center space-x-2">
              <div className="text-right mr-2 hidden sm:block">
                  <span className="block text-sm font-semibold text-gray-800">
                    {user.user_metadata?.memberName || (user.email ? user.email.split('@')[0] : 'Usuario')}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {isSalesMember ? "Sales Member" : "Administrator"}
                  </span>
              </div>
              <Button 
                variant="ghost" 
                onClick={handleLogoutClick} 
                disabled={isLoggingOut}
                className={`text-gray-600 hover:text-red-600 hover:bg-red-100 ${isLoggingOut ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoggingOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
