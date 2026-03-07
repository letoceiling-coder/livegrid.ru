<?php

return [
    'accepted' => 'Поле :attribute должно быть принято.',
    'array' => 'Поле :attribute должно быть массивом.',
    'boolean' => 'Поле :attribute должно быть логического типа.',
    'confirmed' => 'Поле :attribute не совпадает с подтверждением.',
    'email' => 'Поле :attribute должно быть действительным электронным адресом.',
    'exists' => 'Выбранное значение для поля :attribute некорректно.',
    'image' => 'Поле :attribute должно быть изображением.',
    'integer' => 'Поле :attribute должно быть целым числом.',
    'max' => [
        'numeric' => 'Поле :attribute не должно быть больше :max.',
        'file' => 'Поле :attribute не должно быть больше :max КБ.',
        'string' => 'Поле :attribute не должно быть длиннее :max символов.',
        'array' => 'Поле :attribute не должно содержать больше :max элементов.',
    ],
    'min' => [
        'numeric' => 'Поле :attribute должно быть не меньше :min.',
        'file' => 'Поле :attribute должно быть не меньше :min КБ.',
        'string' => 'Поле :attribute должно содержать не менее :min символов.',
        'array' => 'Поле :attribute должно содержать не менее :min элементов.',
    ],
    'numeric' => 'Поле :attribute должно быть числом.',
    'required' => 'Поле :attribute обязательно для заполнения.',
    'same' => 'Поля :attribute и :other должны совпадать.',
    'string' => 'Поле :attribute должно быть строкой.',
    'unique' => 'Такое значение поля :attribute уже существует.',

    'attributes' => [
        'name' => 'имя',
        'email' => 'email',
        'password' => 'пароль',
        'password_confirmation' => 'подтверждение пароля',
        'token' => 'токен',
    ],
];

