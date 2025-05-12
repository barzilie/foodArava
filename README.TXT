a simple webapp for offering and managing grocery ordering.

features:

1. view all products page where top page will be "Special offers"

2. register with name and phone number and address and a login with name and phone number

3. logged in users can choose products to basket so they will be saved as "order"

the complete order page allows users to modify the address if order is for different address

than registered address.

4. logged in users can update their "order"

5. owner can view all orders sorted by user's name and sorted by product type



mongo scheme types:

USER:

- phone number

- address

- isAdmin?



PRODUCT:

- name

- price per unit

- photo

- description



ORDER:

- user's name

- address

- list of products and quantities

- total price

- order date

- modification date

- completion date



backend:

- authRoutes: login and register

- orderRoutes: perform order and update order

- productRoutes (or if unnecessary it will be in index.js) for viewing products and offers

- adminRoutes for viewing summary of all orders sort by name and by product and filter by dates

- main page is welcome page

- login and register routes to allproducts page

- order confirmation routes to all products page



frontEnd:

- welcome screen with background with description, background photo and register, login, products buttons

- view all products screen with special offers top. register button if not logged in,

option to add products to basket for each product (with quantity add/remove control) and basket price summary calculated, and logout and "my basket" buttons

- my basket screen with option to assign order and change the address. confirm button alerting a "are you sure you want to send order to provider?" pop up

order confirmation routes to all products with "thank you for your order" pop up on top of all products page

- login screen with two field form: full name and phone number

- registration screen with full name, address and phone number

- admin page with button appears in top left next to Page name only for admin user




