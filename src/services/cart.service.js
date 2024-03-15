const httpStatus = require("http-status");
const { Cart, Product } = require("../models");
const ApiError = require("../utils/ApiError");
const config = require("../config/config");
const catchAsync = require("../utils/catchAsync");

// TODO: CRIO_TASK_MODULE_CART - Implement the Cart service methods

/**
 * Fetches cart for a user
 * - Fetch user's cart from Mongo
 * - If cart doesn't exist, throw ApiError
 * --- status code  - 404 NOT FOUND
 * --- message - "User does not have a cart"
 *
 * @param {User} user
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const getCartByUser = async (user) => {
  const cart = await Cart.findOne({email:user.email});
  if(!cart)
    throw new ApiError(httpStatus.NOT_FOUND,"User does not have a cart");
  return cart;
};

/**
 * Adds a new product to cart
 * - Get user's cart object using "Cart" model's findOne() method
 * --- If it doesn't exist, create one
 * --- If cart creation fails, throw ApiError with "500 Internal Server Error" status code
 *
 * - If product to add already in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product already in cart. Use the cart sidebar to update or remove product from cart"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - Otherwise, add product to user's cart
 *
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const addProductToCart = async (user, productId, quantity) => {
  let cart = await Cart.findOne({email:user.email});

  if(!cart)
  {
    try {
      cart = await Cart({
        email: user.email,
        cartItems: []
      });
    } catch (error) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error")
    }  
  }
  
  cart.cartItems.map((item)=>{
    if(item.product._id == productId)
      throw new ApiError(httpStatus.BAD_REQUEST,"Product already in cart. Use the cart sidebar to update or remove product from cart")
  })
    
   
  let product = await Product.findById(productId);

  if(!product)
    throw new ApiError(httpStatus.BAD_REQUEST,"Product doesn't exist in database")
  
  cart.cartItems.push({product: product,quantity: quantity});
  await cart.save();
  return cart
};

/**
 * Updates the quantity of an already existing product in cart
 * - Get user's cart object using "Cart" model's findOne() method
 * - If cart doesn't exist, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart. Use POST to create cart and add a product"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * - Otherwise, update the product's quantity in user's cart to the new quantity provided and return the cart object
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const updateProductInCart = async (user, productId, quantity) => {
  let cart = await Cart.findOne({email:user.email});

  if(!cart)
  {
    throw new ApiError(httpStatus.BAD_REQUEST,"User does not have a cart. Use POST to create cart and add a product")
  }  
   
  let product = await Product.findById(productId);

  if(!product)
    throw new ApiError(httpStatus.BAD_REQUEST,"Product doesn't exist in database")
  
  let i;  
  for(i = 0;i<cart.cartItems.length;i++)
  {
    if(cart.cartItems[i].product._id == productId)
    {
      cart.cartItems[i].quantity = quantity;
      break;
    }
  }

  if(i === cart.cartItems.length)
    throw new ApiError(httpStatus.BAD_REQUEST,"Product not in cart")

  await cart.save();
  return cart
};

/**
 * Deletes an already existing product in cart
 * - If cart doesn't exist for user, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * Otherwise, remove the product from user's cart
 *
 *
 * @param {User} user
 * @param {string} productId
 * @throws {ApiError}
 */
const deleteProductFromCart = async (user, productId) => {
  let cart = await Cart.findOne({email:user.email});

  if(!cart)
  {
    throw new ApiError(httpStatus.BAD_REQUEST,"User does not have a cart")
  }

  let i;  
  for(i = 0;i<cart.cartItems.length;i++)
  {
    if(cart.cartItems[i].product._id == productId)
    {
      break;
    }
  }

  if(i === cart.cartItems.length)
    throw new ApiError(httpStatus.BAD_REQUEST,"Product not in cart")
  
  cart.cartItems.splice(i,1)
  await cart.save();
  return;
};

// TODO: CRIO_TASK_MODULE_TEST - Implement checkout function
/**
 * Checkout a users cart.
 * On success, users cart must have no products.
 *
 * @param {User} user
 * @returns {Promise}
 * @throws {ApiError} when cart is invalid
 */
const checkout = async (user) => {
  let cart = await Cart.findOne({email:user.email});
  if(!cart)
  {
    throw new ApiError(httpStatus.NOT_FOUND,"User does not have a cart")
  } 
  if(cart.cartItems.length === 0)
    throw new ApiError(httpStatus.BAD_REQUEST,"Cart is empty")

  let addess_set = await user.hasSetNonDefaultAddress();
  if(!addess_set) 
    throw new ApiError(httpStatus.BAD_REQUEST,"User address is not set")

  let total_sum = 0;
  cart.cartItems.forEach(item => {
    total_sum += (item.product.cost*item.quantity)
  });

  if(total_sum>user.walletMoney)
    throw new ApiError(httpStatus.BAD_REQUEST,"Not enough money in wallet")
  
  cart.cartItems = [];
  await cart.save();
  user.walletMoney -= total_sum;
  await user.save();
  
  return;
};

module.exports = {
  getCartByUser,
  addProductToCart,
  updateProductInCart,
  deleteProductFromCart,
  checkout,
};
