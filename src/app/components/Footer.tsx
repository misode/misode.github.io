import { useLocale } from '../contexts/index.js'
import { Octicon } from './index.js'

interface Props {
	donate?: boolean
}
export function Footer({ donate }: Props) {
	const { locale } = useLocale()

	return (
		<footer>
			<p>
				<span>
					{locale('developed_by')}{' '}
					<a
						href='https://github.com/misode'
						target='_blank'
						rel='noreferrer'
					>
						Misode
					</a>
				</span>
				<span>
					{', modified by'}{' '}
					<a
						href='https://github.com/rsnfreud'
						target='_blank'
						rel='noreferrer'
					>
						RSNFreud
					</a>
				</span>
			</p>
			{donate !== false && (
				<p class='donate'>
					{Octicon.heart}
					<a
						href='https://ko-fi.com/misode'
						target='_blank'
						rel='noreferrer'
					>
						{'Donate to Misode'}
					</a>{' '}
				</p>
			)}
		</footer>
	)
}
