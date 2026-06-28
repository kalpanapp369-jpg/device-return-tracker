
    (function() {
      const savedTheme = localStorage.getItem('theme') || 'dark';
      if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  
