# Feature: CRM Basico

## Objetivo
Cadastrar e consultar clientes do restaurante.

## Entidade
- `Customer`

## Tela
- `/dashboard/[restaurantId]/customers`

## API
- `GET|POST /api/restaurants/[restaurantId]/customers`

## Seguranca
- `GET`: role `WAITER`
- `POST`: role `MANAGER`
