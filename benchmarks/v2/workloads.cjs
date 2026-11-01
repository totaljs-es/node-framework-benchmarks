'use strict';
// Identical deterministic application work for every adapter. No framework-specific fast paths.
const products = Array.from({ length: 1000 }, (_, id) => ({
 id, name: 'Product ' + id, category: id % 10, price: (id * 37 % 10000) / 100, stock: id % 7
}));
exports.hello = () => ({ hello: 'world' });
exports.catalog = () => ({ items: products.filter(p => p.category === 3 && p.stock > 0)
 .sort((a, b) => a.price - b.price || a.id - b.id).slice(0, 20)
 .map(p => ({ id: p.id, name: p.name, price: p.price, available: true })) });
exports.upstream = async () => {
 const r = await fetch(process.env.BENCH_UPSTREAM + '/data');
 if (!r.ok) throw Error('upstream HTTP ' + r.status);
 const data = await r.json();
 return { customer: data.customer, items: data.items, total: data.items.reduce((n, p) => n + p.quantity * p.price, 0) };
};
exports.endpoints = [
 { id: 'hello', path: '/hello/', expected: exports.hello() },
 { id: 'catalog', path: '/catalog/', expected: exports.catalog() },
 { id: 'validate', path: '/validate/', method: 'POST', body: JSON.stringify({ name: 'Ann', age: 30 }), headers: { 'content-type': 'application/json' }, expected: { name: 'Ann', age: 30 } },
 { id: 'upstream', path: '/upstream/', expected: { customer: 42, items: [{ price: 12, quantity: 2 }, { price: 7, quantity: 3 }], total: 45 } }
];
