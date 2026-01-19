import { useState } from "react";

type Props = {
  items: { objectPath: string; url: string }[];
  onSelect?: (url: string) => void;
};

export default function GalleryCarousel({ items, onSelect }: Props) {
  const [index, setIndex] = useState(0);
  if (items.length === 0) return null;
  const current = items[index];

  const next = () => setIndex((i) => (i + 1) % items.length);
  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border bg-black/5">
        <img
          src={current.url}
          alt={current.objectPath}
          className="w-full max-h-[520px] object-cover cursor-pointer"
          onClick={() => onSelect?.(current.url)}
        />
        {items.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-between px-3 text-white">
            <button onClick={prev} className="bg-black/40 rounded-full px-3 py-1 text-sm font-semibold">Prev</button>
            <button onClick={next} className="bg-black/40 rounded-full px-3 py-1 text-sm font-semibold">Next</button>
          </div>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item, i) => (
          <img
            key={item.objectPath}
            src={item.url}
            alt={item.objectPath}
            className={`h-16 w-24 rounded-lg object-cover border ${i === index ? "border-indigo-500" : "border-transparent"}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}



