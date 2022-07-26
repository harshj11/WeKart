import { createSlice } from '@reduxjs/toolkit';
import { setLoading, setLoadedSuccessfully, setErrors, clearErrors } from '../ui/uiSlice';

import axios from 'axios';

export const productSlice = createSlice({
    name: 'products',
    initialState: {
        products: [],
        productsByCategory: null,
        productsCount: 0,
        product: {}
    },
    reducers: {
        setProducts: (state, { payload }) => {
            return {
                products: payload.products,
                productsCount: payload.productCount,
                product: state.product
            }
        }, 
        setProduct: (state, { payload }) => {
            return {
                ...state,
                loading: false,
                product: payload
            }
        },
        setProductsByCategory: (state, { payload }) => {
            if(state.productsByCategory === null) {;
                return {
                    ...state,
                    productsByCategory: {
                        [payload[1]] : [...payload[0].products]
                    }
                }   
            }

            return {
                ...state,
                productsByCategory: state.products.reduce((group, product) => {
                    const { category }  = product;
                    group[category] = group[category] ?? [];
                    group[category].push(product);
                    return group;
                }, {})
            }
        }
    }
});

export const fetchProducts = () => {
    return async (dispatch, getState) => {
        try {
            dispatch(setLoading());
            const { data } = await axios.get('/api/v1/products');
            dispatch(setProducts(data));
            dispatch(setProductsByCategory());
            dispatch(clearErrors());
            dispatch(setLoadedSuccessfully());
        } catch(error) {
            dispatch(setErrors({
                data: error.response.data,
                statusCode: error.response.status,
                statusText: error.response.statusText
            }));
        }
    }
}

export const fetchProductById = (id) => {
    return async (dispatch, getState) => {
        try {
            dispatch(setLoading());
            const { data } = await axios.get(`/api/v1/product/${id}`);
            dispatch(setProduct(data.product));
            dispatch(clearErrors());
            dispatch(setLoadedSuccessfully());
        } catch(error) {
            dispatch(setErrors({
                data: error.response.data,
                statusCode: error.response.status,
                statusText: error.response.statusText
            }));
        }
    }
}

export const fetchProductsByCategory = (category) => {
    return async (dispatch, getState) => {
        try {
            dispatch(setLoading());
            const { data } = await axios.get(`/api/v1/products/${category}`);
            dispatch(setProductsByCategory([data, category]));
            dispatch(clearErrors());
            dispatch(setLoadedSuccessfully());
        } catch(error) {
            dispatch(setErrors({
                data: error.response.data,
                statusCode: error.response.status,
                statusText: error.response.statusText
            }));
        }

    }
}

export const { loadingProducts, setProducts, setProduct, setProductsByCategory } = productSlice.actions;
export default productSlice.reducer;