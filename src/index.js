const fs = require('fs')
const path = require('path')

const puppeteer = require('puppeteer')

const getCategories = require('./categories')

let browser
let page
let categories

async function startApp() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-fullscreen']
    })
  }

  if (!page) {
    page = (await browser.pages())[0]
  }

  // show app UI
  const html = fs.readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8')
  await page.setContent(html)
  await page.addStyleTag({ path: path.resolve(__dirname, '../public/style.css') })
  
  // try to get categories and recommendations
  if (!categories) {
    try {
      categories = await getCategories()
    } catch (_) {
      restartApp()
    }
  }
  
  // fill and enable UI dropdown & button
  await page.$eval('#dropdown', (dropdown, categories) => {
    const options = categories.map(cat => {
      const option = document.createElement('option')
      option.setAttribute('value', cat.book)
      option.innerHTML = cat.genre
      return option
    })
    dropdown.append(...options)
    dropdown.removeAttribute('disabled')
    dropdown.addEventListener('change', () => {
      const button = document.querySelector('#go')
      button.removeAttribute('disabled')
      button.addEventListener('click', () => {
        const category = document.querySelector('#dropdown').value
        window.go(category)
      })
    }, { once: true })
  }, categories)
    
  await page.exposeFunction('go', getBook)
}

//////////////
// USER INTERACTION
//////////////

async function getBook(title) {
  // try to find book on amazon and add it to the cart
  try {
    await page.goto('https://www.amazon.de/')

    // search for the title
    await page.waitForSelector('#twotabsearchtextbox')
    await page.type('#twotabsearchtextbox', title)
    await page.click('#nav-search-submit-button')

    // select the book among the search results
    await page.waitForSelector('.s-result-item.s-asin h2 span')
    await page.$$eval('.s-result-item.s-asin h2 span', (results, title) => {
      const result = results.find(res => {
        const titleParts = title.split(':')
        return titleParts.every(t => res.innerHTML.includes(t.trim()))
      })
      result.click()
    }, title)

    // select hardcover option
    await page.waitForSelector('#formats li a.a-button-text')
    await page.$$eval('#formats li a.a-button-text', buttons => {
      const hardcover = [...buttons].find(b => b.innerText.includes('Gebundenes Buch'))
      hardcover.click()
    })

    // add book to cart
    await page.waitForSelector('#add-to-cart-button')
    await page.$eval('#add-to-cart-button', (button) => button.click())
    
    // go to checkout
    await page.waitForSelector('#hlb-ptc-btn')
    await page.click('#hlb-ptc-btn')

  } catch (_) {
    // show error page
    const errorPage = fs.readFileSync(path.resolve(__dirname, '../public/errorPage.html'), 'utf8')
    await page.setContent(errorPage)
    await page.addStyleTag({ path: path.resolve(__dirname, '../public/style.css') })

    await page.$eval('#restart', button => {
      button.addEventListener('click', () => window.restart())
    })

    //////////////
    // USER INTERACTION
    //////////////
  
    await page.exposeFunction('restart', startApp)
  }
}

startApp()