import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoWorkflow } from "react-icons/go";
import { MdSchema } from "react-icons/md";
import { fetchFormFieldData } from "../../utils/request-utils";

interface Feature {
	title: string;
	subtitle: string;
	description: string;
	path: string;
	icon: JSX.Element;
}

const features: Feature[] = [
	{
		title: "Schema Validation",
		subtitle: "Verify Individual Payloads Instantly",
		description:
			"Ensure your JSONs are ONDC-compliant by validating schemas against model implementations requirements instantly.",
		path: "/schema",
		icon: <MdSchema className="text-green-500 text-4xl" />,
	},
	// {
	//   title: "Unit Testing",
	//   subtitle: "Test API Action Pairs",
	//   description:
	//     "Run API pair tests to validate request-response pairs, understanding and ensuring action pairs behave as expected.",
	//   path: "/unit",
	//   icon: <TbTestPipe2Filled className="text-blue-500 text-4xl" />,
	// },
	{
		title: "Scenario Testing",
		subtitle: "Simulate End-to-End Transaction Flows",
		description:
			"Run complete workflows across buyer app and seller app interactions ensuring accurate transaction flow implementation and protocol compliance.",
		path: "/scenario",
		icon: <GoWorkflow className="text-yellow-500 text-4xl" />,
	},
	// {
	//   title: "Custom Flow Workbench",
	//   description: "Custom flow workbench.",
	//   path: "/customFlow",
	//   icon: <PiNetwork className="text-purple-500 text-4xl" />,
	// },
];

// const domains = {
//   domain: [
//     {
//       key: "ONDC:TRV11",
//       version: [
//         {
//           key: "2.0.0",
//           usecase: ["Metro", "Bus"],
//         },
//         {
//           key: "2.1.0",
//           usecase: ["Metro", "Bus"],
//         },
//       ],
//     },
//     {
//       key: "ONDC:FIS11",
//       version: [
//         {
//           key: "2.0.1",
//           usecase: ["SIP", "Hotel"],
//         },
//       ],
//     },
//   ],
// };

const Features: React.FC = () => {
	const navigate = useNavigate();
	const [activeDomain, setActiveDomain] = useState<any>({});

	const getFormFields = async () => {
		const data = await fetchFormFieldData();
		setActiveDomain(data);
	};

	useEffect(() => {
		getFormFields();
	}, []);

	return (
		<div className="bg-gradient-to-br from-gray-100 to-gray-200 py-10 px-8">
			<h2 className="text-4xl font-extrabold text-center text-gray-800 mb-12">
			    Our Features
			</h2>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
				{features.map((feature, index) => (
					<div
						key={index}
						className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-transform transform hover:-translate-y-1 p-6 text-center cursor-pointer"
						onClick={() => {
							navigate(feature.path);
						}}
					>
						<div className="mb-4">{feature.icon}</div>
						<h3 className="text-2xl font-semibold text-gray-700 mb-3">
							{feature.title}
						</h3>
						<h3 className="text-md font-semibold text-gray-700 mb-3">
							{feature.subtitle}
						</h3>
						<p className="text-gray-600 leading-relaxed">
							{feature.description}
						</p>
					</div>
				))}
			</div>
			<h2 className="text-4xl font-extrabold text-center text-gray-800 mb-12 mt-12">
				Active Domain
			</h2>
			<div className="bg-white rounded-2xl shadow-lg p-6 ">
				{activeDomain?.domain?.map((dom: any) => {
					return (
						<>
							<h3 className="text-lg font-semibold text-gray-700 my-5">
								{dom.key}
							</h3>
							<div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-8">
								{dom.version.map((ver: any) => {
									return ver.usecase.map((val: any) => {
										return (
											<div className="flex flex-row gap-4 justify-between items-center rounded-full bg-slate-200 px-4">
												<p className="text-gray-600 leading-relaxed">{val}</p>
												<p className="text-sm text-gray-800 leading-relaxed p-2 rounded-full px-2">
													{ver.key}
												</p>
											</div>
										);
									});
								})}
							</div>
						</>
					);
				})}
			</div>
		</div>
	);
};

export default Features;
