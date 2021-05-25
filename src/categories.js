const puppeteer = require('puppeteer');

async function getCategories() {
  // extract categories and recommended book titles from goodreads.com
  const headlessBrowser = await puppeteer.launch()
  const headlessPage = await headlessBrowser.newPage()
  await headlessPage.goto('https://www.goodreads.com/choiceawards/best-books-2020')
  const categories = await headlessPage.$$eval('.category', cats => cats.map(cat => {
    return {
      genre: cat.querySelector('.category__copy').innerText,
      book: cat.querySelector('.category__winnerImage').alt.replace(/\(.*\)/, '').trim(),
    }
  }))
  headlessBrowser.close()

  return categories
}

module.exports = getCategories