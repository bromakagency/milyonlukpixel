export function Footer() {
  return (
    <footer className="w-full border-t-4 border-black bg-white py-8 px-4 text-center">
      <p className="font-mono text-sm text-gray-600">
        © {new Date().getFullYear()} Milyonluk Ana Sayfa. Tüm hakları saklıdır.
      </p>
    </footer>
  );
}
