const baseUrl = 'https://api.scryfall.com/cards'

const searchResultsElement = document.getElementById('search-results');

searchResultsElement.addEventListener('contextmenu', (e) => e.preventDefault());

function clearSearchResults() {
  searchResultsElement.innerHTML = '';
}

class Modal {
  constructor(htmlElement) {
    this.htmlElement = htmlElement;
    this.img = htmlElement.querySelector('img');
    this.backdrop = htmlElement.querySelector('#backdrop');
    this.backdrop.addEventListener('click', this.hide.bind(this));
  }

  hide() {
    this.htmlElement.classList.remove('visible');
  }

  show(newImageSource) {
    this.img.onload = () => {
      this.htmlElement.classList.add('visible');
    }
    this.img.src = newImageSource;
  }
}

class Card {
  renders = {
    deckList: () => {
      const element = document.createElement('li');
      element.className = 'card';
      element.innerHTML = `<img src=${this.images[0]} alt="${this.name}" />`;
      element.addEventListener('click', this.handleLeftClick.bind(this));
      element.addEventListener('contextmenu', this.handleAlternateRightClick.bind(this));
      return element;
    },
    searchResult: () => {
      const element = document.createElement('li');
      element.className = 'card';
      element.innerHTML = `<img src=${this.images[0]} alt="${this.name}" />`;
      element.addEventListener('click', this.handleLeftClick.bind(this));
      element.addEventListener('contextmenu', this.handleRightClick.bind(this));
      return element;
    },
  }

  constructor(data, options) {
    const { image_uris, name, id } = data;
    this.name = name;
    this.id = id;
    if (!image_uris) return;

    if (options) {
      this.handlers = options.handlers;
    }

    this.images = [image_uris.small, image_uris.png];
  }

  handleAlternateRightClick(e) {
    e.preventDefault();
    this.handlers.alternateRightClick(this);
  }

  handleLeftClick() {
    this.handlers.leftClick(this);
  }

  handleRightClick(e) {
    e.preventDefault();
    this.handlers.rightClick(this);
  }

  remove(type) {
    this.htmlElements[type].pop().remove();
  }

  render(type) {
    if (!this.images) {
      return document.createTextNode('');
    }

    return this.renders[type]();
  }
}

function getAPIResults(searchTerm) {
  return new Promise((resolve, reject) => {
    const encodedSearchTerm = encodeURIComponent(searchTerm);
    fetch(`${baseUrl}/search?order=cmc&q=${encodedSearchTerm}`)
      .then((response) => response.json())
      .then((jsonData) => resolve(jsonData.data))
    .catch((err) => reject(err));
  })
}

const searchFieldElement = document.getElementById('search-field');

const modal = new Modal(document.getElementById('modal'));

function enlargeCard(card) {
  modal.show(card.images[1]);
}

class Deck {
  list = {};

  constructor(htmlElement) {
    this.htmlElement = htmlElement;
    this.listElement = this.htmlElement.querySelector('#deck-list');
  }

  addCard(card) {
    const cardElement = card.render('deckList');

    if (!this.list[card.id]) {
      this.renderSublist(card.id);
    }

    const cardList = this.list[card.id];

    cardList.count += 1;

    cardElement.style.zIndex = cardList.count;
    cardElement.style.order = cardList.count;
    cardElement.style.left = `${cardList.count * 24}px`;

    cardList.subList.appendChild(cardElement);
  }

  renderSublist(id) {
    const listElement = document.createElement('li');
    const subList = document.createElement('ul');

    listElement.appendChild(subList);
    this.list[id] = { listElement, subList, count: 0 }

    this.listElement.appendChild(listElement);
  }

  removeCard(card) {
    let cardList = this.list[card.id];
    cardList.subList.lastChild.remove();
    cardList.count -= 1;
    if(!cardList.count) {
      cardList.listElement.remove();
      delete this.list[card.id];
    }
  }
}

const deck = new Deck(document.getElementById('deck'));

document.getElementById('build-options').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!searchFieldElement.value) return;

  clearSearchResults();
  const searchTerm = searchFieldElement.value;

  getAPIResults(`f:modern ${searchTerm}`)
  .then((apiList) => {
    apiList.forEach((cardData) => {
      const newCard = new Card(cardData, {
        handlers: {
          leftClick: enlargeCard,
          rightClick: deck.addCard.bind(deck),
          alternateRightClick: deck.removeCard.bind(deck),
        },
      });

      searchResultsElement.appendChild(newCard.render('searchResult'));
    });
  });
});
