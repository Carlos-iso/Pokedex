// Screen core

const state = {
	mode: "search", // search | list | detail
	list: [],
	nextUrl: null,
	previousUrl: null,
	selectedIndex: 0,
	selectedPokemon: null,
};
const screens = document.querySelectorAll(".screen");

function setScreen(name) {
	state.mode = name;
	document
		.querySelectorAll(".screen")
		.forEach((s) => s.classList.remove("active"));

	document.querySelector(`.${name}`).classList.add("active");
}

// Screen core

// App

async function searchPokemon(query) {
	try {
		const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=100`);
		const data = await res.json();
		console.log("Fetched Pokémon data:", data);
		if (data.next) {
			state.nextUrl = data.next;
			state.previousUrl = data.previous;
			console.log("Next URL:", state.nextUrl);
			console.log("Back URL:", state.previousUrl);
		} else {
			document.getElementById("next").disabled = !state.nextUrl;
			alert("No more Pokémon to load.");
		}
		const filtered = toFilter(data.results, query);
		state.list = filtered.slice(0, 100);
		state.selectedIndex = 0;
		setScreen("list");
		renderList();
	} catch (error) {
		console.error("Error searching for Pokémon:", error);
		alert("An error occurred while searching. Please try again.");
		return;
	}
}

function toFilter(data, q) {
	// Função Utilitária para filtrar os Pokémon com base na consulta do usuário
	return data.filter(
		(p) =>
			p.name.includes(q.toLowerCase()) ||
			data.results.indexOf(p).toString() === q,
	);
}

function upperFirst(str) {
	return str[0].toUpperCase() + str.slice(1);
}

async function nextPage() {
	if (!state.nextUrl) {
		document.getElementById("next").disabled = !state.nextUrl;
		alert("No more Pokémon to load.");
		return;
	}
	try {
		const url = await fetch(state.nextUrl);
		const dataUrl = await url.json();
		// Se a lista ficar muito grande, pode ser necessário implementar uma estratégia de limpeza
		state.list = state.list.concat(dataUrl.results);
		state.nextUrl = dataUrl.next;
		state.previousUrl = dataUrl.previous;
		state.selectedIndex = 0;
		renderList();
	} catch (error) {
		alert("An error occurred while loading the next page. Please try again.");
	}
}

async function previousPage() {
	if (!state.previousUrl) {
		document.getElementById("previous").disabled = !state.previousUrl;
		alert("No previous page available.");
		return;
	}
	try {
		const url = await fetch(state.previousUrl);
		const dataUrl = await url.json();
		// Se a lista ficar muito grande, pode ser necessário implementar uma estratégia de limpeza
		state.list = dataUrl.results;
		state.previousUrl = dataUrl.previous;
		state.nextUrl = dataUrl.next;
		state.selectedIndex = 0;
		renderList();
	} catch (error) {
		alert(
			"An error occurred while loading the previous page. Please try again.",
		);
	}
}

 function renderList() {
	const ul = document.querySelector(".pokemon-list");
	ul.innerHTML = "";
	state.list.forEach(async (p, i) => {
		const li = document.createElement("li");
		li.innerHTML = `#${i + 1} ${upperFirst(p.name)}`;
		if (i === state.selectedIndex) {
			li.classList.add("active");
		}
		li.onclick = () => selectPokemon(i);
		ul.appendChild(li);
	});
}

function applyType(types) {
	const detail = document.querySelector(".detail");

	// remove classes antigas
	detail.className = "screen detail active";

	// adiciona tipos
	types.forEach((t) => {
		detail.classList.add(`type-${t.type.name}`);
	});
}

async function navigateList() {
	const ul = document.querySelector(".pokemon-list");
	const li = document.createElement("li");
	for (let i = 0; i < state.list.length; i++) {
		const p = state.list[i];
		if (i === state.selectedIndex) {
			li.classList.add("active");
		}
		li.onclick = () => selectPokemon(i);
		ul.appendChild(li);
	}
}

async function selectPokemon(index) {
	const p = state.list[index];
	try {
		const res = await fetch(p.url);
		const pokemon = await res.json();
		state.selectedPokemon = pokemon;
		await renderDetail(pokemon);
		setScreen("detail");
	} catch (error) {
		console.error("Error fetching Pokémon details:", error);
		alert(
			"An error occurred while fetching Pokémon details. Please try again.",
		);
	}
}
async function getSprite(name) {
	try {
		const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
		const data = await res.json();
		return data.sprites.front_default;
	} catch (error) {
		console.error("Error fetching Pokémon sprite:", error);
		return null;
	}
}

function renderEvolutions(chain) {
	const container = document.querySelector(".evolutions");
	container.innerHTML = "";
	const label = document.createElement("h4");
	label.innerHTML = "Evolutions:";
	container.appendChild(label);

	async function traverse(node) {
		const img = document.createElement("img");
		const name = upperFirst(node.species.name);
		const el = document.createElement("span");
		img.src = await getSprite(node.species.name);
		el.textContent = name;
		el.appendChild(img);
		container.appendChild(el);
		node.evolves_to.forEach(traverse);
	}
	traverse(chain);
}

async function renderDetail(pokemon) {
	document.querySelector(".name").textContent = upperFirst(pokemon.name);
	document.querySelector(".id").textContent = `#${pokemon.id}`;
	document.querySelector(".sprite").src = pokemon.sprites.front_default;
	applyType(pokemon.types);
	let spe;
	// descrição
	try {
		const speciesRes = await fetch(pokemon.species.url);
		const species = await speciesRes.json();
		spe = species;

		const flavor = species.flavor_text_entries.find(
			(f) => f.language.name === "en",
		);

		document.querySelector(".description").innerHTML =
			`<strong>Description:</strong> ${flavor?.flavor_text.replace(//g, "")}` ||
			"No description";
		// evolução
		try {
			const evoRes = await fetch(spe.evolution_chain.url);
			const evoData = await evoRes.json();

			renderEvolutions(evoData.chain);
		} catch (error) {
			console.error("Error fetching Pokémon evolution data:", error);
			document.querySelector(".evolutions").textContent = "No evolutions";
		}
	} catch (error) {
		console.error("Error fetching Pokémon species data:", error);
		document.querySelector(".description").textContent = "No description";
	}
}

document
	.querySelectorAll(".pokemon-list li")
	.forEach((li) => (li.onclick = () => selectPokemon(li)));

document.querySelector(".search input").addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		searchPokemon(e.target.value);
	}
});
document.querySelector(".pokeball").onclick = () => {
	setScreen("search");
	document.querySelector(".search input").value = "";
};

// App