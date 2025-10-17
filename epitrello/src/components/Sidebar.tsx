export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r p-4 hidden md:block">
      <h2 className="text-sm font-medium mb-2 text-gray-700">My Boards</h2>
      <ul className="space-y-1">
        <li className="hover:bg-gray-100 p-2 rounded-md cursor-pointer">A</li>
        <li className="hover:bg-gray-100 p-2 rounded-md cursor-pointer">B</li>
      </ul>
    </aside>
  );
}
