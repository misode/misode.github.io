module.exports = {
	env: {
		es6: true,
		node: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		tsconfigRootDir: __dirname,
		project: './tsconfig-eslint.json',
	},
	plugins: [
		'@typescript-eslint',
	],
	ignorePatterns: [
		'**/node_modules',
		'**/dist',
	],
	rules: {
		'@typescript-eslint/consistent-type-imports': [
			'warn',
			{
				prefer: 'type-imports',
			},
		],
		'@typescript-eslint/prefer-readonly': 'warn',
		'@typescript-eslint/quotes': [
			'warn',
			'single',
			{
				avoidEscape: true,
			},
		],
		'@typescript-eslint/semi': [
			'warn',
			'never',
		],
		'@typescript-eslint/indent': [
			'warn',
			'tab',
		],
		'@typescript-eslint/member-delimiter-style': [
			'warn',
			{
				multiline: {
					delimiter: 'comma',
					requireLast: true,
				},
				singleline: {
					delimiter: 'comma',
					requireLast: false,
				},
				overrides: {
					interface: {
						multiline: {
							delimiter: undefined,
						},
					},
				},
			},
		],
		'comma-dangle': 'off',
		'@typescript-eslint/comma-dangle': ['warn', 'always-multiline'],
		indent: 'off',
		'eol-last': 'warn',
		'no-fallthrough': 'warn',
		'prefer-const': 'warn',
		'prefer-object-spread': 'warn',
		'quote-props': [
			'warn',
			'as-needed',
			{ numbers: true },
		],
	},
}
